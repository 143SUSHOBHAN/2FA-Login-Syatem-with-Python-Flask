document.addEventListener('DOMContentLoaded', function() {
    const otpInputs = document.querySelectorAll('.otp-input');
    const form = document.getElementById('otpForm');
    const finalOtp = document.getElementById('finalOtp');
    const resendOtp = document.getElementById('resendOtp');
    const verifyBtn = document.getElementById('verifyBtn');
    const messageDiv = document.getElementById('message');
    const timeLeftSpan = document.getElementById('time-left');
    const resendSection = document.getElementById('resendSection');
    
    let countdownInterval;
    const OTP_EXPIRY_TIME = 30; // seconds
    
    // Start the countdown
    function startCountdown() {
        // Clear any existing interval
        if (countdownInterval) clearInterval(countdownInterval);
        
        // Start with client-side countdown as fallback
        let timeLeft = OTP_EXPIRY_TIME;
        let lastServerUpdate = Date.now();
        
        // Update immediately
        updateCountdownDisplay(timeLeft);
        
        // Start the countdown
        countdownInterval = setInterval(() => {
            timeLeft--;
            updateCountdownDisplay(timeLeft);
            
            // Check server time every 5 seconds to stay in sync
            const now = Date.now();
            if (now - lastServerUpdate > 5000) {
                fetch('/api/otp_time')
                    .then(response => response.json())
                    .then(data => {
                        if (data.time_left !== undefined) {
                            const serverTimeLeft = Math.ceil(data.time_left);
                            if (Math.abs(serverTimeLeft - timeLeft) > 2) {
                                // If difference is more than 2 seconds, sync with server
                                timeLeft = serverTimeLeft;
                                updateCountdownDisplay(timeLeft);
                            }
                        }
                    })
                    .catch(error => console.error('Error syncing OTP time:', error));
                
                lastServerUpdate = now;
            }
            
            if (timeLeft <= 0) {
                clearInterval(countdownInterval);
                handleOtpExpiry();
            }
        }, 1000);
    }
    
    function updateCountdownDisplay(timeLeft) {
        timeLeftSpan.textContent = timeLeft;
        if (timeLeft <= 10) {
            timeLeftSpan.style.color = '#ff4d4d';
            timeLeftSpan.style.fontWeight = 'bold';
        } else if (timeLeft <= 20) {
            timeLeftSpan.style.color = '#ffcc00';
        } else {
            timeLeftSpan.style.color = '#0ff';
        }
    }
    
    function handleOtpExpiry() {
        verifyBtn.disabled = true;
        document.querySelector('.countdown').style.color = '#ff4d4d';
        resendSection.style.display = 'block';
        showMessage('OTP has expired. Please request a new one.', 'error');
    }
    
    // Show message to user
    function showMessage(message, type = 'info') {
        messageDiv.textContent = message;
        messageDiv.style.color = type === 'error' ? '#ff4d4d' : '#0ff';
        
        // Clear message after 5 seconds
        if (type !== 'error') {
            setTimeout(() => {
                messageDiv.textContent = '';
            }, 5000);
        }
    }

    // Auto-focus first input
    if (otpInputs.length > 0) otpInputs[0].focus();

    otpInputs.forEach((input, index) => {
        // Allow only numbers
        input.addEventListener('input', (e) => {
            // Remove any non-digit characters
            input.value = input.value.replace(/\D/g, '');
            
            // Auto move to next input
            if (input.value && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
        });

        // Handle backspace
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace') {
                if (!input.value && index > 0) {
                    otpInputs[index - 1].focus();
                }
            }
        });

        // Paste event
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasteData = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
            pasteData.split('').forEach((char, i) => {
                if (index + i < otpInputs.length) {
                    otpInputs[index + i].value = char;
                }
            });
            
            // If pasted OTP is complete, submit the form
            if (pasteData.length === otpInputs.length) {
                form.dispatchEvent(new Event('submit'));
            }
        });
    });

    // On form submit, combine OTP digits, encrypt and verify
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Combine OTP digits
        let otp = '';
        otpInputs.forEach(input => otp += input.value);
        
        // Validate OTP length
        if (otp.length !== otpInputs.length) {
            showMessage('Please enter a complete OTP', 'error');
            return;
        }
        
        // Show loading state
        const verifyBtn = document.getElementById('verifyBtn');
        const originalText = verifyBtn.textContent;
        verifyBtn.disabled = true;
        verifyBtn.textContent = 'Verifying...';
        
        try {
            // For debugging, send plain OTP
            console.log('Sending OTP for verification:', otp);
            
            const response = await fetch('/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    otp: otp  // Sending plain OTP for now
                }),
                credentials: 'same-origin'  // Important for sending cookies with the request
            });
            
            const data = await response.json();
            console.log('Verification response:', data);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // Handle expired OTP
            if (data.expired) {
                clearInterval(countdownInterval);
                handleOtpExpiry();
                return;
            }
            
            if (data.success) {
                showMessage('Verification successful! Redirecting...', 'success');
                // Clear any existing countdown
                clearInterval(countdownInterval);
                // Redirect after a short delay
                setTimeout(() => {
                    window.location.href = data.redirect;
                }, 1000);
            } else {
                // If OTP expired, show resend option
                if (data.message && data.message.toLowerCase().includes('expired')) {
                    clearInterval(countdownInterval);
                    document.querySelector('.countdown').style.display = 'none';
                    resendSection.style.display = 'block';
                }
                showMessage(data.message || 'Verification failed. Please try again.', 'error');
                
                // Reset OTP inputs on failure
                otpInputs.forEach(input => input.value = '');
                if (otpInputs.length > 0) otpInputs[0].focus();
            }
        } catch (error) {
            showMessage('An error occurred. Please try again.', 'error');
            console.error('Error:', error);
        } finally {
            verifyBtn.disabled = false;
            verifyBtn.textContent = originalText;
        }
    });

    // Resend OTP
    resendOtp.addEventListener('click', async function(e) {
        e.preventDefault();
        
        // Disable resend button to prevent multiple clicks
        resendOtp.style.pointerEvents = 'none';
        const originalText = resendOtp.textContent;
        resendOtp.textContent = 'Sending...';
        
        try {
            const response = await fetch('/resend_otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({})
            });
            
            const data = await response.json();
            
            if (data.success) {
                showMessage('New OTP sent successfully!', 'success');
                startCountdown();
                verifyBtn.disabled = false;
                document.querySelector('.countdown').style.color = '#0ff';
                resendSection.style.display = 'none';
                
                // Clear input fields and focus first one
                otpInputs.forEach(input => input.value = '');
                if (otpInputs.length > 0) otpInputs[0].focus();
            } else {
                showMessage(data.message || 'Failed to resend OTP', 'error');
            }
        } catch (error) {
            showMessage('An error occurred. Please try again.', 'error');
            console.error('Error:', error);
        } finally {
            resendOtp.textContent = originalText;
            // Re-enable the resend button after 30 seconds
            setTimeout(() => {
                resendOtp.style.pointerEvents = 'auto';
            }, 30000);
        }
    });
    
    // Start the countdown when the page loads
    startCountdown();
    
    // Check OTP time remaining from server
    async function checkOtpTime() {
        try {
            const response = await fetch('/api/otp_time');
            const data = await response.json();
            
            if (data.time_left > 0) {
                // If there's still time left, update the countdown
                timeLeftSpan.textContent = data.time_left;
                
                // If countdown wasn't running, start it
                if (!countdownInterval) {
                    startCountdown();
                }
            } else {
                // If time is up, show expired message
                clearInterval(countdownInterval);
                verifyBtn.disabled = true;
                document.querySelector('.countdown').style.color = '#ff4d4d';
                resendSection.style.display = 'block';
                showMessage('OTP has expired. Please request a new one.', 'error');
            }
        } catch (error) {
            console.error('Error checking OTP time:', error);
        }
    }
    
    // Check OTP time every 5 seconds
    setInterval(checkOtpTime, 5000);
});
