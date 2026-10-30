import { createPortal } from 'react-dom';

/** Renders children into <body>, outside the animated page wrapper (whose transform would trap position: fixed). */
function Portal({ children }) {
    return createPortal(children, document.body);
}

export default Portal;
