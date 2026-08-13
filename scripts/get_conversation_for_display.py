#!/usr/bin/env python3
import sqlite3, sys, json

def find(display_name):
    db='backend/signal_clone.db'
    conn=sqlite3.connect(db)
    conn.row_factory=sqlite3.Row
    cur=conn.cursor()
    # find user id
    cur.execute('SELECT id, username, display_name, is_online, last_seen_at FROM users WHERE display_name=? COLLATE NOCASE', (display_name,))
    user = cur.fetchone()
    if not user:
        print(json.dumps({'error':'user not found'}))
        return
    uid = user['id']
    # find a conversation where this user is a member and has at least one other member
    cur.execute('''
    SELECT c.id, c.conversation_type, c.title, c.created_by_id, c.created_at, c.updated_at
    FROM conversations c
    JOIN conversation_members cm ON cm.conversation_id = c.id
    WHERE cm.user_id = ?
    ORDER BY c.updated_at DESC
    LIMIT 1
    ''', (uid,))
    conv = cur.fetchone()
    if not conv:
        print(json.dumps({'error':'conversation not found'}))
        return
    conv_id = conv['id']
    # get members
    cur.execute('''SELECT u.id, u.username, u.display_name, u.is_online, u.last_seen_at
    FROM users u
    JOIN conversation_members cm ON cm.user_id = u.id
    WHERE cm.conversation_id = ?
    ORDER BY cm.joined_at
    ''', (conv_id,))
    members = [dict(r) for r in cur.fetchall()]
    # normalize
    for m in members:
        m['is_online'] = bool(m['is_online'])
        if m['last_seen_at'] is None:
            m['last_seen_at'] = None
    out = {
        'conversation': dict(conv),
        'members': members,
        'user': dict(user)
    }
    print(json.dumps(out, default=str))
    conn.close()

if __name__=='__main__':
    if len(sys.argv)<2:
        print('usage')
    else:
        find(sys.argv[1])
