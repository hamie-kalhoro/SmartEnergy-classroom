@app.route('/api/users', methods=['GET'])
def get_users():
    """Get list of all users. (Admin only ideally, currently public endpoint but intended for admin)"""
    # In a real app, verify JWT token here
    users = User.query.all()
    return jsonify([{
        'id': u.id,
        'username': u.username,
        'email': u.email,
        'role': u.role,
        'is_active': u.is_active_account
    } for u in users])
