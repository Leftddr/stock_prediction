import torch
import torch.optim as optim
import numpy as np
import matplotlib.pyplot as plt
import pred
import pandas as pd
import sys

train_ratio = .2
hidden_dim = 10
output_dim = 1
learning_rate = .01
iterations = 1000

device = 'cuda' if torch.cuda.is_available() else 'cpu'
torch.manual_seed(777)
if device =='cuda':
    torch.cuda.manual_seed_all(777)

class Net(torch.nn.Module):
    def __init__(self, input_dim, hidden_dim, output_dim, layers):
        super(Net, self).__init__()
        self.rnn = torch.nn.LSTM(input_dim, hidden_dim, num_layers = layers, batch_first = True)
        self.fc = torch.nn.Linear(hidden_dim, output_dim, bias = True)

    def forward(self, x):
        x, _status = self.rnn(x)
        x = self.fc(x[:, -1])
        return x

def minmax_scaler(data):
    numerator = data - np.min(data, 0)
    denominator = np.max(data, 0) - np.min(data, 0)
    return numerator / (denominator + 1e-7)

def build_dataset(time_series, seq_length):
    dataX = []
    dataY = []
    for i in range(0, len(time_series) - seq_length):
        ## 유동적으로 x, y를 구분해 주기 위함
        _x = time_series[i:i + seq_length, : len(time_series) - 1]
        _y = time_series[i + seq_length, [-1]]
        print(_x, "->", _y)
        dataX.append(_x)
        dataY.append(_y)
    return np.array(dataX), np.array(dataY)

def train(net, x, y):
    criterion = torch.nn.MSELoss().to(device)
    optimizer = optim.Adam(net.parameters(), lr = learning_rate)

    for i in range(iterations):
        optimizer.zero_grad()
        outputs = net(x)
        loss = criterion(outputs, y)
        optimizer.step()
        print(i, loss.item())

def evaulate(net, x, y):
    correct = 0; total = 0

    ##test를 할때는 no_grad로 해야한다.
    with torch.no_grad():
        ##실수로써 값을 출력한다.
        outputs = net(x).data
        correct = len(np.where(abs(np.array(outputs) - np.array(y)) <= 0.01)) 
    
    print('Accuracy of the network on the test stock : %d ' % (100 * correct / y.size(0)))

def draw(df, date):
    plt.figure()
    plt.plot(date, df['close'], 'm-.s')
    plt.title('Stock difference')
    plt.xticks(rotation = 90)
    plt.xlabel('date')
    plt.ylabel('stock close')
    plt.show()

if __name__ == "__main__":
    df, date = pred.get_response()

    if df == -1:
        sys.exit(1)

    normal_data = df.values
    ##normal, adj 두개를 구분한다.
    normal_train_data = normal_data[:len(normal_data) * train_ratio, :]
    normal_test_data = normal_data[len(normal_data) * train_ratio :, :]

    normal_trainx, normal_trainy = build_dataset(normal_train_data, 7)
    normal_testx, normal_testy = build_dataset(normal_test_data, 7)
    
    ##tensor로 변환한다.
    trainx_tensor = torch.FloatTensor(normal_trainx).to(device)
    trainy_tensor = torch.FloatTensor(normal_trainy).to(device)

    testx_tensor = torch.FloatTensor(normal_testx).to(device)
    testy_tensor = torch.FloatTensor(normal_testy).to(device)

    ##Class를 선언한다.
    net = Net(len(normal_data) - 1, hidden_dim, output_dim, 3)

    print('Learning Start')
    train(net, trainx_tensor, trainy_tensor)
    print('Learning End')

    print('Test Start')
    evaulate(net, testx_tensor,  testy_tensor)
    print('Test End')


