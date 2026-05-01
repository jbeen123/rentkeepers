import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+K or Cmd+K - Global search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Search"]');
        if (searchInput) {
          searchInput.focus();
        }
      }

      // Ctrl+N or Cmd+N - New tenant
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        navigate('/tenants/add');
      }

      // Ctrl+P or Cmd+P - New payment
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        navigate('/payments');
      }

      // Ctrl+H or Cmd+H - Go home/dashboard
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        navigate('/dashboard');
      }

      // Ctrl+T or Cmd+T - Toggle theme
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
      }

      // Escape - Clear selections/close modals
      if (e.key === 'Escape') {
        const modals = document.querySelectorAll('[role="dialog"]');
        modals.forEach(modal => {
          const closeBtn = modal.querySelector('button');
          if (closeBtn) closeBtn.click();
        });
      }

      // ? - Show keyboard shortcuts help
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        showShortcutsHelp();
      }
    };

    const showShortcutsHelp = () => {
      const helpText = `
Keyboard Shortcuts:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ctrl+K  - Focus search
Ctrl+N  - New tenant
Ctrl+P  - New payment
Ctrl+H  - Go to dashboard
Ctrl+T  - Toggle dark mode
Escape - Close modals
?      - Show this help
      `.trim();
      console.log(helpText);
      alert(helpText);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);
}
