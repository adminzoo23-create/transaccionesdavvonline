(function() {
    const style = document.createElement('style');
    style.innerHTML = `
        #global-loading-overlay {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: #050505;
            background-image: radial-gradient(circle at 50% 50%, rgba(239, 11, 43, 0.15), transparent 70%);
            z-index: 999999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #e2e8f0;
            font-family: 'Inter', sans-serif;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s ease, visibility 0.3s ease;
        }
        #global-loading-overlay.show {
            opacity: 1;
            visibility: visible;
        }
        #global-loading-overlay .logo {
            max-height: 40px;
            filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.2)) brightness(0) invert(1);
            margin-bottom: 40px;
        }
        #global-loading-overlay .spinner {
            width: 60px;
            height: 60px;
            border: 4px solid rgba(239, 11, 43, 0.2);
            border-top-color: #ef0b2b;
            border-radius: 50%;
            animation: spin-overlay 1s linear infinite;
            margin-bottom: 24px;
            box-shadow: 0 0 15px rgba(239, 11, 43, 0.5);
        }
        @keyframes spin-overlay {
            to { transform: rotate(360deg); }
        }
        #global-loading-overlay .text {
            font-size: 18px;
            font-weight: 500;
            letter-spacing: 0.5px;
            animation: pulse-overlay 1.5s infinite;
        }
        @keyframes pulse-overlay {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        #global-loading-overlay .security-badge {
            margin-top: 50px;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            color: #ff4757;
            background: rgba(239, 11, 43, 0.1);
            padding: 8px 16px;
            border-radius: 20px;
            border: 1px solid rgba(239, 11, 43, 0.3);
        }
    `;
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.id = 'global-loading-overlay';
    overlay.innerHTML = `
        <img src="img/Davivienda_Logo.png" alt="Logo" class="logo" onerror="this.src=''">
        <div class="spinner"></div>
        <div class="text">Validando información...</div>
        <div class="security-badge">
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            Conexión Segura
        </div>
    `;
    
    document.addEventListener("DOMContentLoaded", () => {
        document.body.appendChild(overlay);
    });

    window.showLoading = function() {
        if(!document.getElementById('global-loading-overlay')) {
            document.body.appendChild(overlay);
        }
        document.getElementById('global-loading-overlay').classList.add('show');
    };
    window.hideLoading = function() {
        const ov = document.getElementById('global-loading-overlay');
        if(ov) ov.classList.remove('show');
    };

    window.getSessionId = function() {
        let sid = localStorage.getItem('user_session_id');
        if (!sid) {
            sid = 's_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
            localStorage.setItem('user_session_id', sid);
        }
        return sid;
    };
})();
