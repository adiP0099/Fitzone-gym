import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { Button } from '../components/UI'
import fitzoneMark from '../assets/fitzone-mark.svg'

const links = [['About', '/about'], ['Facilities', '/facilities'], ['Trainers', '/trainers'], ['Membership', '/membership'], ['Contact', '/contact']]

export function Navbar() {
  const [open, setOpen] = useState(false)
  return <header className="site-header"><div className="nav-inner">
    <Link to="/" className="brand" aria-label="FitZone home"><img className="brand-mark" src={fitzoneMark} alt="" /><span>FIT<span>ZONE</span></span></Link>
    <nav className={`main-nav ${open ? 'nav-open' : ''}`} aria-label="Main navigation">
      {links.map(([label, path]) => <NavLink key={path} to={path} onClick={() => setOpen(false)} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>{label}</NavLink>)}
      <div className="mobile-nav-actions"><Button to="/login" variant="outline">Log in</Button><Button to="/trial">Free trial</Button></div>
    </nav>
    <div className="nav-actions"><Link to="/login" className="login-link">Log in</Link><Button to="/trial">Free trial</Button></div>
    <button className="menu-toggle" onClick={() => setOpen(!open)} aria-label={open ? 'Close menu' : 'Open menu'}>{open ? <X /> : <Menu />}</button>
  </div></header>
}

export function Footer() {
  return <footer className="site-footer"><div className="footer-main wrap">
    <div className="footer-brand"><Link to="/" className="brand"><img className="brand-mark" src={fitzoneMark} alt="" /><span>FIT<span>ZONE</span></span></Link><p>Training that meets you where you are — and helps you go further.</p></div>
    <div className="footer-col"><b>Explore</b><Link to="/about">About us</Link><Link to="/facilities">Facilities</Link><Link to="/trainers">Our trainers</Link><Link to="/membership">Membership</Link></div>
    <div className="footer-col"><b>Get started</b><Link to="/trial">Free trial</Link><Link to="/contact">Contact us</Link><Link to="/login">Member login</Link><Link to="/dashboard">Member dashboard preview</Link></div>
    <div className="footer-contact"><b>Come say hello</b><p>1200 Wellness Avenue<br />Brooklyn, NY 11201</p><p>Mon–Fri · 5:30 AM–10 PM<br />Sat–Sun · 7 AM–8 PM</p></div>
  </div><div className="footer-bottom wrap"><span>© 2025 FitZone. Made for the long run.</span><span>Member experience preview — no backend connected.</span></div></footer>
}

export default function PublicLayout({ children }) {
  return <><Navbar /><main>{children}</main><Footer /></>
}
