import { ArrowRight, Check, LoaderCircle, Search } from 'lucide-react'
import { Link } from 'react-router-dom'

export function Button({ children, to, variant = 'primary', className = '', type = 'button', ...props }) {
  const styles = variant === 'outline' ? 'btn btn-outline' : variant === 'dark' ? 'btn btn-dark' : variant === 'text' ? 'btn btn-text' : 'btn btn-primary'
  const content = <>{children}{variant !== 'text' && <ArrowRight size={16} strokeWidth={2.2} />}</>
  return to ? <Link to={to} className={`${styles} ${className}`}>{content}</Link> : <button type={type} className={`${styles} ${className}`} {...props}>{content}</button>
}

export function Eyebrow({ children }) { return <span className="eyebrow"><i />{children}</span> }

export function SectionTitle({ eyebrow, title, text, light = false, className = '' }) {
  return <div className={`section-title ${light ? 'text-white' : ''} ${className}`}>
    {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}<h2>{title}</h2>{text && <p>{text}</p>}
  </div>
}

export function PageIntro({ eyebrow, title, text }) {
  return <div className="page-intro"><Eyebrow>{eyebrow}</Eyebrow><h1>{title}</h1><p>{text}</p></div>
}

export function Card({ children, className = '' }) { return <div className={`surface-card ${className}`}>{children}</div> }

export function FeatureList({ items }) {
  return <ul className="feature-list">{items.map(item => <li key={item}><Check size={16} />{item}</li>)}</ul>
}

export function SearchBox({ value, onChange, placeholder = 'Search...' }) {
  return <label className="search-box"><Search size={16} /><input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} /></label>
}

export function Loader({ label = 'Loading' }) {
  return <div className="loader-line" role="status"><LoaderCircle size={18} className="spin" />{label}</div>
}

export function Badge({ children, tone = 'green' }) { return <span className={`badge badge-${tone}`}>{children}</span> }

export function EmptyState({ title, text, action }) {
  return <div className="empty-state"><span className="empty-mark">FZ</span><h3>{title}</h3><p>{text}</p>{action}</div>
}
