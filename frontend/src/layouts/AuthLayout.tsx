import * as React from 'react';
import { Outlet } from 'react-router-dom';
import './AuthLayout.css';

const backgroundImage = '/images/image-fundo.png';
const logoImage = '/images/image.png';

export function AuthLayout(): React.JSX.Element {
  const [pointer, setPointer] = React.useState({ x: 50, y: 50, active: false });

  const updatePointer = (event: React.PointerEvent<HTMLDivElement>): void => {
    const bounds = event.currentTarget.getBoundingClientRect();
    setPointer({
      x: ((event.clientX - bounds.left) / bounds.width) * 100,
      y: ((event.clientY - bounds.top) / bounds.height) * 100,
      active: true,
    });
  };

  return (
    <div
      className={`auth-layout${pointer.active ? ' auth-layout--pointer-active' : ''}`}
      onPointerEnter={updatePointer}
      onPointerLeave={() => {
        setPointer((current) => ({ ...current, active: false }));
      }}
      onPointerMove={updatePointer}
      style={
        {
          '--pointer-x': `${String(pointer.x)}%`,
          '--pointer-y': `${String(pointer.y)}%`,
        } as React.CSSProperties
      }
    >
      <div
        aria-hidden="true"
        className="auth-layout__background"
        style={{ backgroundImage: `url("${backgroundImage}")` }}
      />
      <div
        aria-hidden="true"
        className="auth-layout__background auth-layout__background--blurred"
        style={{ backgroundImage: `url("${backgroundImage}")` }}
      />
      <img className="auth-layout__logo" src={logoImage} alt="Bridge351 HR Suite" />
      <div className="auth-layout__content">
        <Outlet />
      </div>
    </div>
  );
}
