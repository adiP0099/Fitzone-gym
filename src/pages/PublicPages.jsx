import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUpRight, Dumbbell, HeartPulse, Clock3, Users, MapPin, Phone, Mail, Instagram, Trophy, Target, Eye, Quote, Check, Wifi, ShowerHead, Bike, Activity, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button, Card, EmptyState, Eyebrow, FeatureList, Loader, PageIntro, SectionTitle } from '../components/UI'
import { DemoForm } from '../components/Forms'
import { trainers } from '../data/mock'
import { getPublicPlans } from '../services/plans'
import { useAuth } from '../contexts/AuthContext'
import { getMemberMembershipRequests, submitMembershipRequest } from '../services/membershipRequests'

const img = (id, width = 1400) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85`

export function Home() {
  return <>
    <section className="hero"><img className="hero-image" src={img('photo-1534438327276-14e5300c3a48', 2000)} alt="Modern, fully equipped FitZone training floor" /><div className="hero-overlay" /><div className="wrap hero-content"><Eyebrow>BUILT AROUND YOUR POTENTIAL</Eyebrow><h1>STRONGER<br />STARTS <span>HERE.</span></h1><p>Good training changes more than your body. Find your rhythm, your people, and a reason to keep showing up.</p><div className="hero-actions"><Button to="/trial">Try FitZone free</Button><Button to="/about" variant="outline">Discover our approach</Button></div><div className="hero-note"><span className="hero-dot" /> OPEN TODAY <b>5:30 AM – 10:00 PM</b></div></div><a className="scroll-cue" href="#intro"><ArrowDown size={16} /> SCROLL TO EXPLORE</a></section>
    <section id="intro" className="section wrap intro-grid"><div><Eyebrow>MORE THAN A GYM</Eyebrow><h2>A PLACE TO<br /><span>GET BETTER.</span></h2></div><div className="intro-copy"><p className="lead">You don’t need to be an athlete to train like one. You just need a place that believes in what you can become.</p><p>At FitZone, expert coaching, thoughtful programming, and a welcoming community make every visit count. Wherever you’re starting, we’ll help you find your next step.</p><Button to="/about" variant="text">Our story <ArrowUpRight size={16} /></Button></div></section>
    <section className="benefits-band"><div className="wrap benefit-grid">{[[Dumbbell, 'Training that fits', 'Personalized paths for every starting point.'], [HeartPulse, 'Coaches who care', 'Real guidance, no judgment, every step.'], [Users, 'People make the place', 'A community that keeps you coming back.']].map(([Icon, title, text]) => <div className="benefit-item" key={title}><Icon /><div><b>{title}</b><p>{text}</p></div></div>)}</div></section>
    <section className="section wrap"><SectionTitle eyebrow="ROOM TO MOVE" title="BUILT FOR YOUR NEXT REP" text="Everything you need to train well, recover fully, and keep progressing."/><div className="facility-grid">
      {[['photo-1534438327276-14e5300c3a48', 'Strength floor', 'Serious equipment. Space to find your flow.'], ['photo-1518611012118-696072aa579a', 'Group studio', 'Small-group energy with expert-led classes.'], ['photo-1571019613454-1cb2f99b2d8b', 'Recovery room', 'Make recovery part of your training.']].map(([photo, title, text], i) => <Link to="/facilities" className={`facility-tile facility-${i + 1}`} key={title}><img src={img(photo, 900)} alt={title} /><div><span>0{i + 1} / FACILITY</span><h3>{title}</h3><p>{text}</p></div><ArrowUpRight /></Link>)}
    </div><div className="center-cta"><Button to="/facilities" variant="outline">Explore our facilities</Button></div></section>
    <section className="dark-section section"><div className="wrap"><div className="split-heading"><SectionTitle eyebrow="GOOD PEOPLE, GREAT COACHING" title="MEET YOUR COACHES" light text="Good coaching makes hard things feel possible."/><Button to="/trainers" variant="outline">Meet the full team</Button></div><div className="trainer-grid">{trainers.map(t => <TrainerCard key={t.name} trainer={t} />)}</div></div></section>
    <section className="section wrap plan-preview"><div><Eyebrow>YOUR MEMBERSHIP, YOUR WAY</Eyebrow><h2>MAKE ROOM<br />FOR <span>MORE.</span></h2><p>Start with the essentials. Add what you need. The best plan is the one that gets you through the door.</p><Button to="/membership" variant="outline">Compare memberships</Button></div><div className="plan-callout"><div className="plan-callout-top"><span>THE COMMUNITY FAVORITE</span><b>02</b></div><h3>Performance</h3><p>Coaching and classes to build a routine that sticks.</p><div className="callout-price"><b>$69</b><span>/ month</span></div><FeatureList items={['Full gym floor access', '4 group classes each month', 'Monthly coach check-in']} /><Button to="/trial">Try us first</Button></div></section>
    <section className="testimonial section"><div className="wrap quote-wrap"><Quote size={28} /><Eyebrow>REAL PEOPLE. REAL PROGRESS.</Eyebrow><blockquote>“For the first time, training feels like something I do for myself — not something I have to get through.”</blockquote><div className="quote-person"><span className="avatar">AM</span><div><b>Alex Morgan</b><small>FitZone member since 2023</small></div></div><span className="quote-count">01 — 03</span></div></section>
    <section className="closing-cta"><img src={img('photo-1517836357463-d25dfeac3438')} alt="" /><div className="closing-overlay" /><div className="wrap closing-content"><Eyebrow>YOUR FIRST SESSION IS ON US</Eyebrow><h2>SHOW UP.<br />WE’LL TAKE IT <span>FROM HERE.</span></h2><Button to="/trial">Book your free trial</Button></div></section>
  </>
}

function TrainerCard({ trainer }) {
  return <article className="trainer-card"><img src={img(trainer.image, 650)} alt={`${trainer.name}, ${trainer.specialty} coach`} /><div className="trainer-card-info"><span>{trainer.experience}</span><h3>{trainer.name}</h3><p>{trainer.specialty}</p></div><span className="trainer-arrow"><ArrowUpRight size={19} /></span></article>
}

export function About() {
  return <><PageIntro eyebrow="A LITTLE ABOUT US" title={<>WE’RE HERE FOR<br /><em>YOUR NEXT.</em></>} text="FitZone is a neighborhood training club built on one simple idea: better happens together." />
    <section className="section wrap about-story"><div className="about-photo"><img src={img('photo-1534438327276-14e5300c3a48')} alt="The FitZone gym floor" /><span>OUR HOME SINCE 2015</span></div><div className="about-copy"><Eyebrow>OUR STORY</Eyebrow><h2>MADE FOR<br />REAL LIFE.</h2><p>We started FitZone with a belief that fitness should feel less like a test and more like a place you belong. A place to learn, get stronger, and take the long view.</p><p>Today, our coaches, members, and neighbors make this more than a training floor. They make it a community — with room for every goal, every background, and every beginning.</p><Button to="/trial" variant="text">Come see for yourself <ArrowUpRight size={16} /></Button></div></section>
    <section className="mission-section section"><div className="wrap mission-grid"><Card><Target /><Eyebrow>OUR MISSION</Eyebrow><h3>Make meaningful movement part of everyday life.</h3><p>We build confidence through thoughtful coaching, accessible training, and a welcoming place to keep showing up.</p></Card><Card><Eye /><Eyebrow>OUR VISION</Eyebrow><h3>A stronger, more connected community.</h3><p>A future where everyone feels at home in their own strength — and supported in reaching for more.</p></Card></div></section>
    <section className="section wrap"><SectionTitle eyebrow="MILESTONES, NOT FINISH LINES" title="A DECADE OF SHOWING UP" text="A few moments from a journey we're still building together."/><div className="achievement-grid">{[['2015', 'Opened our doors', 'A small training space and a big belief in community.'], ['2018', '1,000 members strong', 'Our first thousand members made this a home.'], ['2022', 'Recovery studio added', 'We made recovery an essential part of training.'], ['2025', 'Ten years, still growing', 'Same neighborhood roots. More room to move.']].map(([year, title, text]) => <div key={year}><b>{year}</b><h3>{title}</h3><p>{text}</p></div>)}</div></section><CtaBand title="Your story starts whenever you're ready." />
  </>
}

function CtaBand({ title = 'Find your place at FitZone.' }) {
  return <section className="cta-band"><div className="wrap"><div><Eyebrow>TAKE THE FIRST STEP</Eyebrow><h2>{title}</h2></div><Button to="/trial">Start with a free trial</Button></div></section>
}

export function Facilities() {
  const items = [
    ['Strength floor', 'A considered mix of free weights, racks, and machines gives you room to build at your pace.', 'photo-1534438327276-14e5300c3a48', '01', [Dumbbell, Bike]],
    ['Group training studio', 'Small-group classes combine smart coaching with the energy of moving together.', 'photo-1518611012118-696072aa579a', '02', [Users, Activity]],
    ['Cardio & conditioning', 'Treadmills, bikes, rowers, and open floor space for the work that gets your heart going.', 'photo-1571019613454-1cb2f99b2d8b', '03', [HeartPulse, Bike]],
    ['Recovery & reset', 'Give your body time to come back stronger in our dedicated stretch and recovery zone.', 'photo-1517836357463-d25dfeac3438', '04', [Sparkles, ShowerHead]],
  ]
  return <><PageIntro eyebrow="SPACE TO DO YOUR THING" title={<>BUILT TO<br /><em>MOVE YOU.</em></>} text="Thoughtful spaces, quality equipment, and a little room to find your rhythm."/><section className="section wrap facility-list">{items.map(([title, text, photo, number, Icons]) => <article className="facility-detail" key={number}><div className="facility-detail-photo"><img src={img(photo)} alt={title} /><span>{number}</span></div><div className="facility-detail-copy"><Eyebrow>THE SPACE / {number}</Eyebrow><h2>{title}</h2><p>{text}</p><div className="facility-icons">{Icons.map((Icon, i) => <span key={i}><Icon size={17} />{i === 0 ? 'Coach-supported' : 'Member access'}</span>)}</div></div></article>)}</section><section className="service-band"><div className="wrap service-grid">{[[ShowerHead, 'Changing rooms'], [Wifi, 'Fast Wi-Fi'], [Bike, 'Secure bike parking'], [Clock3, 'Early to late hours']].map(([Icon, label]) => <div key={label}><Icon /><span>{label}</span></div>)}</div></section><CtaBand /></>
}

export function Trainers() {
  return <><PageIntro eyebrow="COACHING, WITH CARE" title={<>GOOD PEOPLE.<br /><em>GREAT COACHING.</em></>} text="Meet the team who will help you find a way forward, one session at a time."/><section className="section wrap"><div className="trainer-directory">{trainers.map((t, i) => <article className="trainer-profile" key={t.name}><div className="trainer-profile-photo"><img src={img(t.image, 850)} alt={t.name} /><span>0{i + 1}</span></div><div className="trainer-profile-content"><Eyebrow>{t.experience}</Eyebrow><h2>{t.name}</h2><h3>{t.specialty}</h3><p>{['Marcus makes strength training feel approachable and intentional. His sessions are built around the basics, with plenty of room to progress.', 'Sofia helps members build more freedom in their movement. Her coaching brings mobility and recovery into the heart of your routine.', 'Jordan brings energy and structure to performance training. Expect thoughtful programming, clear coaching, and a team-first approach.'][i]}</p><Link to="/trial">Train with {t.name.split(' ')[0]} <ArrowUpRight size={15} /></Link></div></article>)}</div></section><CtaBand title="Great coaching starts with a conversation." /></>
}

export function Membership() {
  const { user } = useAuth()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [requestError, setRequestError] = useState('')
  const [requestSuccess, setRequestSuccess] = useState('')
  const [memberRequests, setMemberRequests] = useState([])
  const [requestsLoading, setRequestsLoading] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    getPublicPlans().then(result => { if (active) setPlans(result) }).catch(loadError => {
      if (import.meta.env.DEV) console.error('[FitZone] Could not load public membership plans', { code: loadError?.code ?? 'unknown', message: loadError?.message ?? String(loadError) })
      if (active) setError('Membership plans could not be loaded. Please try again later.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [reloadKey])

  useEffect(() => {
    let active = true
    if (!user) { setMemberRequests([]); setRequestsLoading(false); return () => { active = false } }
    setRequestsLoading(true)
    getMemberMembershipRequests(user).then(results => { if (active) setMemberRequests(results) }).catch(loadError => {
      if (import.meta.env.DEV) console.error('[FitZone] Could not load member membership requests', { operation: 'membershipRequests.list.own', code: loadError?.code ?? 'unknown', message: loadError?.message ?? String(loadError) })
    }).finally(() => { if (active) setRequestsLoading(false) })
    return () => { active = false }
  }, [user, requestSuccess])

  async function handleMembershipRequest() {
    if (!selectedPlan || submitting) return
    setSubmitting(true)
    setRequestError('')
    setRequestSuccess('')
    try {
      await submitMembershipRequest(user, selectedPlan.id)
      setRequestSuccess(`Your request for ${selectedPlan.name} was sent for FitZone review. It is not an active membership.`)
      setSelectedPlan(null)
    } catch (submitError) {
      if (import.meta.env.DEV) console.error('[FitZone] Could not submit membership request', { operation: 'membershipRequests.create', code: submitError?.code ?? 'unknown', message: submitError?.message ?? String(submitError) })
      setRequestError(submitError?.code === 'permission-denied'
        ? 'Firestore denied this request. Refresh the plans and try again, or contact FitZone.'
        : submitError?.message || 'We could not submit your membership request. Please try again.')
    } finally { setSubmitting(false) }
  }

  return <><PageIntro eyebrow="A PLAN THAT MEETS YOU HERE" title={<>FIND YOUR<br /><em>FIT.</em></>} text="Straightforward memberships, expert support, and room to grow. Choose a plan to send a request for staff review."/><section className="section wrap plans-section">
    {loading ? <Card><Loader label="Loading membership plans�" /></Card> : error ? <Card><p className="form-error" role="alert">{error}</p><Button onClick={() => setReloadKey(key => key + 1)}>Retry</Button></Card> : plans.length ? <div className="plans-grid">{plans.map((plan, i) => <article className={`plan-card ${plan.featured ? 'plan-featured' : ''}`} key={plan.id}>{plan.featured && <span className="popular-tag">MEMBER FAVORITE</span>}<span className="plan-number">{String(i + 1).padStart(2, '0')} / MEMBERSHIP</span><h2>{plan.name}</h2><p>{plan.description}</p><div className="plan-price"><b>${plan.price}</b><span> / {plan.period}</span></div><FeatureList items={plan.features} />{user ? <Button onClick={() => { setSelectedPlan(plan); setRequestError(''); setRequestSuccess('') }} variant={plan.featured ? 'primary' : 'outline'}>Choose Plan</Button> : <Button to="/login" variant={plan.featured ? 'primary' : 'outline'}>Sign in to choose</Button>}</article>)}</div> : <Card><EmptyState title="No active plans right now" text="Please check back soon or contact FitZone for membership information." /></Card>}
    {requestSuccess && <Card><p role="status">{requestSuccess}</p></Card>}
    {user && (requestsLoading || memberRequests.length > 0) && <Card className="membership-request-list"><h3>Your membership requests</h3>{requestsLoading ? <p role="status">Loading requests�</p> : memberRequests.map(request => <p key={request.id}>{request.planName} � ${request.price} � <b>{request.status}</b></p>)}</Card>}
    <div className="plan-footnote"><span>*</span><p>A request is not a payment or active membership. Membership status changes only after authorized review and a separate subscription assignment.</p></div>
  </section>{selectedPlan && <div className="modal-backdrop" role="presentation"><div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="membership-request-title"><h3 id="membership-request-title">Request {selectedPlan.name}?</h3><p>Plan price: ${selectedPlan.price} / {selectedPlan.period}. Submitting sends a request to FitZone for review; it does not charge you or activate a membership.</p>{requestError && <p className="form-error" role="alert">{requestError}</p>}<div><button className="btn btn-outline" type="button" disabled={submitting} onClick={() => setSelectedPlan(null)}>Cancel</button><button className="btn btn-primary" type="button" disabled={submitting} onClick={handleMembershipRequest}>{submitting ? 'Submitting�' : 'Submit request'}</button></div></div></div>}<section className="faq-section"><div className="wrap faq-wrap"><SectionTitle eyebrow="GOOD TO KNOW" title="A FEW QUICK ANSWERS"/><div className="faq-list">{[['Can I try the gym before joining?', 'Absolutely. Use our free trial form to tell us when you would like to visit. Your request is saved for FitZone staff to review, but it does not reserve a visit.'], ['What is included in a membership?', 'Each plan includes clear access and coaching benefits. Compare the plans above to find the right starting point.'], ['Do I need to be fit already?', 'Not at all. Our team welcomes all experience levels and can help you figure out a comfortable first step.']].map(([q, a], i) => <details key={q} open={i === 0}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</div></div></section><CtaBand title="Come in curious. Leave feeling capable." /></>
}
export function Contact() {
  return <><PageIntro eyebrow="WE’RE ALL EARS" title={<>LET’S TALK<br /><em>FITNESS.</em></>} text="A quick question, a big goal, or just want to take a look? Drop us a note or come say hello."/><section className="section wrap contact-grid"><div className="contact-details"><Eyebrow>FIND YOUR WAY TO US</Eyebrow><h2>YOUR LOCAL<br />TRAINING CLUB.</h2><p className="contact-lead">A real person will be happy to help you find the right next step.</p><div className="contact-method"><MapPin /><div><b>Come by</b><span>1200 Wellness Avenue<br />Brooklyn, NY 11201</span></div></div><div className="contact-method"><Phone /><div><b>Give us a call</b><a href="tel:+17185550192">(718) 555-0192</a></div></div><div className="contact-method"><Mail /><div><b>Send us a note</b><a href="mailto:hello@fitzone.example">hello@fitzone.example</a></div></div><div className="contact-method"><Clock3 /><div><b>When we're here</b><span>Mon–Fri 5:30 AM–10 PM<br />Sat–Sun 7 AM–8 PM</span></div></div><a className="social-link" href="https://www.instagram.com/" target="_blank" rel="noreferrer"><Instagram size={18} /> Follow the community</a></div><Card className="contact-form-card"><Eyebrow>SEND A MESSAGE</Eyebrow><h3>How can we help?</h3><p>We’ll point you in the right direction.</p><DemoForm /></Card></section><div className="map-placeholder"><div><MapPin /><b>FitZone · Brooklyn</b><span>1200 Wellness Avenue, Brooklyn, NY</span></div></div></>
}

export function Trial() {
  return <section className="trial-page"><div className="trial-photo"><img src={img('photo-1517836357463-d25dfeac3438')} alt="Athlete training at FitZone" /><div><Eyebrow>ONE SESSION. ZERO PRESSURE.</Eyebrow><h1>MEET US<br />WHERE YOU <em>ARE.</em></h1><p>Come get a feel for the space, meet a coach, and find your own way into training.</p><FeatureList items={['A guided first visit', 'Meet our coaching team', 'No commitment, no pressure']} /></div></div><div className="trial-form-area"><div className="trial-form-card"><Eyebrow>LET’S FIND A TIME</Eyebrow><h2>YOUR FIRST VISIT<br />IS ON US.</h2><p>Tell us a little about yourself and your goals.</p><DemoForm kind="trial" /><small>Submitting saves your request for staff review but does not reserve a visit.</small></div></div></section>
}
