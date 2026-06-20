"""
Управление товарами магазина.
GET  /products — список всех товаров
POST /products body: {action, ...}
  action=create: {title, privilege, price, durationMs}
  action=delete: {id}
"""
import json
import os
import uuid
import psycopg2

SCHEMA = 't_p51500523_user_profile_pass_sy'
CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def resp(status, body):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(body)}

def row_to_product(row):
    return {'id': row[0], 'title': row[1], 'privilege': row[2], 'price': row[3], 'durationMs': row[4]}

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    conn = get_conn()
    cur = conn.cursor()

    if method == 'GET':
        cur.execute(f"SELECT id, title, privilege, price, duration_ms FROM {SCHEMA}.products ORDER BY price ASC")
        rows = cur.fetchall()
        conn.close()
        return resp(200, [row_to_product(r) for r in rows])

    if method == 'POST':
        data = json.loads(event.get('body') or '{}')
        action = data.get('action')

        if action == 'create':
            pid = str(uuid.uuid4())
            cur.execute(
                f"INSERT INTO {SCHEMA}.products (id, title, privilege, price, duration_ms) VALUES (%s, %s, %s, %s, %s)",
                (pid, data['title'], data['privilege'], data['price'], data.get('durationMs'))
            )
            conn.commit()
            conn.close()
            return resp(200, {'id': pid, 'title': data['title'], 'privilege': data['privilege'], 'price': data['price'], 'durationMs': data.get('durationMs')})

        if action == 'delete':
            cur.execute(f"DELETE FROM {SCHEMA}.products WHERE id = %s", (data['id'],))
            conn.commit()
            conn.close()
            return resp(200, {'ok': True})

    conn.close()
    return resp(400, {'error': 'Bad request'})
