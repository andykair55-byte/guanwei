"""临时测试脚本：验证小薇 Pipeline"""
import requests, json

# 登录
r = requests.post('http://localhost:8000/api/v1/users/login', json={'username': 'admin', 'password': '123'})
token = r.json()['access_token']
headers = {'Authorization': f'Bearer {token}'}

# verify
print('=== verify ===')
r2 = requests.post(
    'http://localhost:8000/api/v1/verify',
    json={'content': '某网红直播带货月入百万', 'type': 'text'},
    headers=headers,
    timeout=120,
)
print(f'Status: {r2.status_code}')
data = r2.json()
# 打印所有 key
print(f'keys: {list(data.keys())}')
# 打印完整 JSON（截断到 2000 字符）
full = json.dumps(data, indent=2, ensure_ascii=False)
print(full[:2000])
