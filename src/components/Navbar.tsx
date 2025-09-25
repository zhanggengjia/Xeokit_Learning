import { FaBarsStaggered } from 'react-icons/fa6';

type NavbarProps = {
  items: string[];
  current: number;
  onSelect: React.Dispatch<React.SetStateAction<number>>;
  selectModel: React.Dispatch<React.SetStateAction<number>>;
  modelItems: string[];
  modelCurrent: number;
};

const Navbar = ({
  items,
  current,
  onSelect,
  selectModel,
  modelItems,
  modelCurrent,
}: NavbarProps) => {
  return (
    <nav className="sticky top-0 z-50 bg-base-100/80 backdrop-blur border-b border-base-200 theme-transition">
      <div className="align-element navbar lg:px-10">
        {/* Start */}
        <div className="navbar-start">
          <h2 className="text-3xl font-bold hidden lg:flex">
            <span className="text-sky-600">Xeokit</span>Learning
          </h2>

          {/* Mobile dropdown */}
          <div className="dropdown">
            <label
              tabIndex={0}
              className="btn btn-ghost lg:hidden"
              aria-label="open menu"
            >
              <FaBarsStaggered className="h-6 w-6" />
            </label>
            <ul
              tabIndex={0}
              className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-200 rounded-box w-52"
              role="menu"
            >
              {items.map((label, idx) => (
                <li key={label}>
                  <button
                    type="button"
                    className={idx === current ? 'active' : ''}
                    onClick={() => onSelect(idx)}
                    aria-current={idx === current ? 'page' : undefined}
                    role="menuitem"
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Center (desktop) */}
        <div className="navbar-center hidden lg:flex">
          <ul className="menu menu-horizontal">
            {items.map((label, idx) => (
              <li key={label}>
                <button
                  type="button"
                  className={idx === current ? 'active mx-1' : 'mx-1'}
                  onClick={() => onSelect(idx)}
                  aria-current={idx === current ? 'page' : undefined}
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Center (mobile brand) */}
        <div className="navbar-center lg:hidden">
          <h2 className="text-3xl font-bold">
            <span className="text-sky-600">Xeokit</span>Learning
          </h2>
        </div>
        {/* End */}
        <div className="navbar-end">
          <div className="dropdown">
            <label
              tabIndex={0}
              className="btn btn-ghost"
              aria-label="open menu"
            >
              <FaBarsStaggered className="h-6 w-6" />
            </label>
            <ul
              tabIndex={0}
              className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-200 rounded-box w-52 right-0 -translate-x-2"
              role="menu"
            >
              {modelItems.map((name, idx) => (
                <li key={name}>
                  <button
                    type="button"
                    className={idx === modelCurrent ? 'active' : ''}
                    onClick={() => selectModel(idx)}
                    aria-current={idx === modelCurrent ? 'page' : undefined}
                    role="menuitem"
                  >
                    {name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
