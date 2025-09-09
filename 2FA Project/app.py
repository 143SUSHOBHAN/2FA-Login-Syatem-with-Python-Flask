from flask import Flask, render_template, request, redirect, session, url_for, jsonify
import mysql.connector
from werkzeug.security import generate_password_hash, check_password_hash
import random
import smtplib
import time
from email.mime.text import MIMEText
from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_OAEP
import base64

app = Flask(__name__)
app.secret_key = 'your_secret_key'
app.config['SESSION_TYPE'] = 'filesystem'  # Use filesystem session
app.config['PERMANENT_SESSION_LIFETIME'] = 1800  # 30 minutes session lifetime
app.config['SESSION_FILE_THRESHOLD'] = 100  # Maximum number of session files to keep

# Generate RSA key pair for OTP encryption
def generate_rsa_keys():
    key = RSA.generate(2048)
    private_key = key.export_key()
    public_key = key.publickey().export_key()
    return private_key, public_key

# Generate keys when the server starts
PRIVATE_KEY, PUBLIC_KEY = generate_rsa_keys()

# MySQL connection
db = mysql.connector.connect(
    host="localhost",
    user="root",
    password="Sushobhan@2973",
    database="simple_2fa"
)
cursor = db.cursor(dictionary=True)

# Registration
@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        name = request.form['name']
        email = request.form['email']
        
        # Check if email already exists
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        if cursor.fetchone():
            return render_template("registration/register_error.html", 
                                error="Email already registered")
        
        # Check if username already exists
        cursor.execute("SELECT * FROM users WHERE name = %s", (name,))
        if cursor.fetchone():
            return render_template("registration/register_error.html",
                                error="Username already taken")
        
        # If no duplicates, create new user
        password = generate_password_hash(request.form['password'])
        cursor.execute("""
            INSERT INTO users (name, email, password_hash) 
            VALUES (%s, %s, %s)
        """, (name, email, password))
        db.commit()
        return render_template("registration/register_success.html")
    return render_template("registration/index.html")

# Root route - show registration page
@app.route('/')
def index():
    return redirect(url_for('register'))

# Login
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        if user and check_password_hash(user['password_hash'], password):
            # Generate a new OTP
            otp = str(random.randint(1000, 9999))
            
            # Store user data in session for later use
            session['user_id'] = user['id']
            session['email'] = email
            session['name'] = user['name']  # Store the user's name
            
            # Store OTP and its creation time
            session['otp'] = otp
            session['otp_time'] = time.time()
            
            # Force session to be saved
            session.modified = True
            
            # Debug: Print session info
            print(f"Generated OTP: {otp}")
            print(f"Session after setting OTP: {dict(session)}")
            
            # Send OTP via email
            send_otp(email, otp)
            
            # Get the public key to send to the client
            public_key_str = PUBLIC_KEY.decode('utf-8')
            return render_template('otp/otp.html', public_key=public_key_str, otp_time=30)
        else:
            return "Invalid credentials"
    return render_template("login/login.html")

# OTP check
@app.route('/verify', methods=['POST'])
def verify():
    try:
        data = request.get_json()
        if not data or 'otp' not in data:
            print("Error: No OTP in request data")
            return jsonify({'success': False, 'message': 'Invalid request', 'expired': False})
            
        input_otp = str(data.get('otp')).strip()
        stored_otp = session.get('otp')
        otp_time = session.get('otp_time', 0)
        
        # Debug: Print session info
        print("\n=== OTP Verification ===")
        print(f"Session: {dict(session)}")
        print(f"Input OTP: {input_otp} (type: {type(input_otp)})")
        print(f"Stored OTP: {stored_otp} (type: {type(stored_otp) if stored_otp else 'None'})")
        print(f"OTP Time: {otp_time}")
        print(f"Current Time: {time.time()}")
        print(f"Time Diff: {time.time() - otp_time}")
        
        # Check if OTP exists in session
        if not stored_otp:
            print("Error: No OTP found in session")
            return jsonify({
                'success': False, 
                'message': 'No OTP found. Please request a new one.',
                'expired': True
            })
        
        # Convert stored_otp to string for comparison
        stored_otp = str(stored_otp).strip()
        time_diff = time.time() - otp_time
        
        # Check if OTP has expired (30 seconds)
        if time_diff > 30:
            print(f"OTP expired. Time difference: {time_diff} seconds")
            # Clear expired OTP
            session.pop('otp', None)
            session.pop('otp_time', None)
            session.modified = True
            return jsonify({
                'success': False, 
                'message': 'OTP has expired. Please request a new one.',
                'expired': True
            })
        
        # Verify the OTP
        if input_otp == stored_otp:
            print("OTP verification successful")
            # Get user info before clearing session
            user_email = session.get('email')
            user_id = session.get('user_id')
            
            # Clear OTP data from session
            session.pop('otp', None)
            session.pop('otp_time', None)
            
            # Set authentication and user info
            session['authenticated'] = True
            session['email'] = user_email
            session['user_id'] = user_id
            session.modified = True
            
            print(f"Session after successful verification: {dict(session)}")
            
            return jsonify({
                'success': True, 
                'redirect': url_for('login_success'),
                'message': 'Verification successful!'
            })
        
        print(f"Invalid OTP. Input: '{input_otp}', Stored: '{stored_otp}'")
        return jsonify({
            'success': False, 
            'message': 'The OTP you entered is incorrect. Please try again.',
            'expired': False
        })
        
    except Exception as e:
        print(f"Error during OTP verification: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False, 
            'message': 'An error occurred while verifying OTP. Please try again.'
        })

# Success route after OTP verification
@app.route('/login_success')
def login_success():
    # Check if user is authenticated
    if not session.get('authenticated'):
        return redirect(url_for('login'))
    # Use the stored name with a fallback to 'User'
    return render_template('login/login_success.html', name=session.get('name', 'User'))

# API endpoint to get remaining OTP time
@app.route('/api/otp_time')
def get_otp_time():
    try:
        otp_time = session.get('otp_time', 0)
        current_time = time.time()
        time_diff = current_time - otp_time
        time_left = max(0, 30 - time_diff)
        
        # Debug logging
        print("\n=== OTP Time Check ===")
        print(f"Current Time: {current_time}")
        print(f"OTP Time: {otp_time}")
        print(f"Time Difference: {time_diff}")
        print(f"Time Left: {time_left}")
        print(f"Session: {dict(session)}")
        
        return jsonify({
            'time_left': time_left,
            'otp_exists': 'otp' in session,
            'server_time': current_time,
            'otp_timestamp': otp_time
        })
    except Exception as e:
        print(f"Error in get_otp_time: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': 'Failed to get OTP time',
            'time_left': 0,
            'otp_exists': False
        })

# Resend OTP
@app.route('/resend_otp', methods=['POST'])
def resend_otp():
    if 'user' not in session:
        return jsonify({'success': False, 'message': 'Session expired. Please log in again.'})
    
    # Generate new OTP
    otp = str(random.randint(1000, 9999))
    session['otp'] = otp
    session['otp_time'] = time.time()
    
    # Encrypt OTP with RSA
    cipher = PKCS1_OAEP.new(RSA.import_key(PUBLIC_KEY))
    encrypted_otp = cipher.encrypt(otp.encode())
    
    # Store the encrypted OTP in session
    session['encrypted_otp'] = base64.b64encode(encrypted_otp).decode('utf-8')
    
    # Get user email from database
    cursor.execute("SELECT email FROM users WHERE name = %s", (session['user'],))
    user = cursor.fetchone()
    
    if user:
        # Send the new OTP
        send_otp(user['email'], otp)
        return jsonify({
            'success': True,
            'message': 'New OTP has been sent to your email.'
        })
    
    return jsonify({'success': False, 'message': 'User not found'})

# Email sender
def send_otp(to_email, otp):
    sender = 'sarkarsushobhan8777@gmail.com'
    password = 'zxmd yhad bccp dqax'  # Use App Password for Gmail
    msg = MIMEText(f"Your OTP is: {otp}")
    msg['Subject'] = "Login OTP"
    msg['From'] = sender
    msg['To'] = to_email

    with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
        server.login(sender, password)
        server.send_message(msg)

if __name__ == '__main__':
    app.run(debug=True)