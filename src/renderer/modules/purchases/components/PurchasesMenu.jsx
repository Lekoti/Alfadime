import React from 'react';
import { Link, useLocation } from 'react-router-dom';

/**
 * Menu do módulo Compras.
 * Adicione este componente na sidebar ou menu lateral do sistema.
 */
export function PurchasesMenu() {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="purchases-menu">
      <h3>Compras</h3>

      <ul>
        <li>
          <Link
            to="/compras/curva-import"
            className={isActive('/compras/curva-import') ? 'active' : ''}
          >
            Importar Curva de Compras
          </Link>
        </li>

        {/* Futuros itens do menu de Compras */}
      </ul>
    </nav>
  );
}

export default PurchasesMenu;