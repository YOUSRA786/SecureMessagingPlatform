#!/usr/bin/env python3
import sqlite3
import sys
import json

def query(name):
    db='backend/signal_clone.db'
    conn=sqlite3.connect(db)
    conn.row_factory=sqlite3.Row
    cur=conn.cursor()
    cur.execute('SELECT id, username, display_name, is_online, last_seen_at FROM users WHERE display_name=? COLLATE NOCASE', (name,))
    row=cur.fetchone()
    conn.close()
    if not row:
        print(json.dumps({'error':'not found'}))
    else:
        d=dict(row)
        # normalize booleans
        d['is_online']=bool(d['is_online'])
        if d['last_seen_at'] is None:
            d['last_seen_at']=None
        print(json.dumps(d, default=str))

if __name__=='__main__':
    if len(sys.argv)<2:
        print('Usage: query_user_by_display.py DISPLAY_NAME')
        sys.exit(2)
    query(sys.argv[1])
