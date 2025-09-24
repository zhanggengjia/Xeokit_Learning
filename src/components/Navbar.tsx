import { FaBarsStaggered } from 'react-icons/fa6';

const Navbar = () => {
  const links = ['loadIFC', 'IFCPick', 'TypeTreeIFC'];
  return (
    <nav className="sticky top-0 z-50 bg-base-100/80 backdrop-blur border-b border-base-200 theme-transition">
      <div className="align-element navbar lg:px-10">
        {/* Start */}
        <div className="navbar-start">
          <h2 className="text-3xl font-bold hidden lg:flex">Xeokit Learning</h2>
          <div className="dropdown">
            <label tabIndex={0} className="btn btn-ghost lg:hidden">
              <FaBarsStaggered className="h-6 w-6" />
            </label>
            <ul
              tabIndex={0}
              className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-200 rounded-box w-52"
            >
              {links.map((link) => {
                return (
                  <li key={link} className="">
                    {link}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
        {/* Center */}
        <div className="navbar-center hidden lg:flex">
          <ul className="menu menu-horizontal">
            {links.map((link) => {
              return (
                <li key={link} className="">
                  {link}
                </li>
              );
            })}
          </ul>
        </div>
        <div className="navbar-center lg:hidden">
          <h2 className="text-3xl font-bold">
            Kevin<span className="text-sky-600">Synth</span>
          </h2>
        </div>
        {/* End */}
        <div className="navbar-end">the end</div>
      </div>
    </nav>
  );
};

export default Navbar;
