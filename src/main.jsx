import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

---

**`src/App.jsx`** — paste the full booking app code from the file above (the `booking-app.jsx` artifact).

---

**File structure in GitHub should look like:**
```
booking-app/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx
    └── App.jsx
