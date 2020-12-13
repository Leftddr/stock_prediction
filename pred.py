import requests
import pandas as pd

params = {
    'access_key' : '',
    'symbols' : 'AAPL',
    'date_from' : None,
    'date_to' : None,
}

def get_response(date_from, date_to):
    '''
    date_from = input('From date ([YYYY-MM-DD] format) : ')
    date_to = input('To date ([YYYY-MM-DD] format) : ')
    '''

    split_date1 = date_from.split('-')
    split_date2 = date_to.split('-')

    if len(split_date1) < 2 or len(split_date2) < 2:
        print('날짜형식에 맞게 입력해 주세요')
        return -1, -1

    if int(split_date2[0]) - int(split_date1[0]) <= 3:
        print('최소 3년 이상을 입력해야 학습이 됩니다.!!!')
        return -2, -2

    params['date_from'] = date_from
    params['date_to'] = date_to

    api_result = requests.get("http://api.marketstack.com/v1/eod", params)
    api_response = api_result.json()

    list_open = []; list_high = []; list_low = []; list_close = []
    list_adj_open = []; list_adj_high = []; list_adj_low = []; list_adj_close = []; list_adj_volume = []
    list_date = []

    for stock in api_response['data']:
        list_open.append(stock['open']); list_high.append(stock['high']); list_low.append(stock['low']); list_close.append(stock['close'])
        list_adj_open.append(stock['adj_open']); list_adj_high.append(stock['adj_high']); list_adj_low.append(stock['adj_low']); list_adj_close.append(stock['adj_close']); list_adj_volume.append('adj_volume')
        list_date.append(stock['date'])
    
    df = pd.DataFrame({'open' : list_open, 'high' : list_high, 'low' : list_low, \
    'adj_open' : list_adj_open, 'adj_high' : list_adj_high, 'adj_low' : list_adj_low, 'adj_close' : list_adj_close, 'close' : list_close})
    
    return df, 1

if __name__ == "__main__":
    get_response()

