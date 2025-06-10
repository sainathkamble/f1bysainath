import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL;

export const Navbar = () => {
  const [hoveredItem, setHoveredItem] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userAvatar, setUserAvatar] = useState('');
  const navigate = useNavigate();

  const navItems = [
    ['Home', 1, "/"], 
    ['Stream', 2, "/stream"], 
    ['Calendar', 3, "/calendar"], 
    ['Schedule', 4, "/schedule"]
  ];

  const NavItem = ({ item, index, route }) => (
    <li className="text-[#f5f5f5] font-semibold text-2xl flex flex-col items-center justify-center relative group px-4"
        onMouseEnter={() => setHoveredItem(index)}
        onMouseLeave={() => setHoveredItem(null)}>
      <a href={route} className="h-auto w-full text-center relative z-10 group-hover:text-[#b50000] transition-colors duration-300">
        {item}
      </a>
      <div className={`h-1 w-0 group-hover:w-full bg-[#b50000] transition-all duration-300 ease-in-out absolute bottom-0 rounded-full`}></div>
    </li>
  );

  const handleLogout = async () => {
    try {
      await axios.post(`${API_URL}/users/logout`, {}, { withCredentials: true });
      setIsLoggedIn(false);
      setUserAvatar('');
      localStorage.removeItem('userEmail');
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await axios.get(`${API_URL}/users/current-user`, { withCredentials: true });
        if (response.data.data) {
          setIsLoggedIn(true);
          setUserAvatar(response.data.data.avatar);
        }
      } catch (error) {
        setIsLoggedIn(false);
        setUserAvatar('');
        const userEmail = localStorage.getItem('userEmail');
        if (error.response?.status === 401) {
          localStorage.removeItem('userEmail');
        }
      }
    }
    checkAuthStatus();
  }, []);

  const renderAuthButton = () => {
    if(isLoggedIn){
      return (
        <div className="relative group">
          <img 
            src={userAvatar} 
            alt="User Avatar" 
            className="h-10 w-10 rounded-full cursor-pointer hover:ring-2 hover:ring-[#b50000] transition-all duration-300"
            onClick={() => navigate('/profile')}
          />
          <div className="absolute right-0 mt-2 w-48 bg-[#1a1a1a] rounded-lg shadow-lg py-2 hidden group-hover:block z-10">
            <a href="/profile" 
              className="block px-4 py-2 text-sm text-[#f5f5f5] hover:bg-[#b50000] transition-colors duration-200">
              Profile
            </a>
            <button onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-[#f5f5f5] hover:bg-[#b50000] transition-colors duration-200">
              Logout
            </button>
          </div>
        </div>
      );
    } else {
      return (
        <a href="/register" className="inline-block px-4 py-2 text-sm font-medium text-[#b50000] border border-[#b50000] rounded-lg hover:bg-[#b50000] hover:text-white transition-colors duration-200">
          Login/Register
        </a>
      );
    }
  };

  return (
    <nav className="h-[10vh] w-full bg-[#121212]">
      <div className="h-[10vh] w-full flex items-center">
          <ul className="flex-1 flex justify-evenly items-center">
            {navItems.map(([item, index, route]) => (
              <NavItem key={index} item={item} index={index} route={route} />
            ))}
          </ul>
          <div className="px-6">
            {renderAuthButton()}
          </div>
      </div>
    </nav>
  );
}