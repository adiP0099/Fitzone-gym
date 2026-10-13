export const trainers = [
  { name: 'Marcus Reed', specialty: 'Strength & conditioning', experience: '8 years coaching', initials: 'MR', color: 'sand', image: 'photo-1534438327276-14e5300c3a48' },
  { name: 'Sofia Bennett', specialty: 'Mobility & recovery', experience: '6 years coaching', initials: 'SB', color: 'rose', image: 'photo-1546483875-ad9014c88eba' },
  { name: 'Jordan Lee', specialty: 'Performance training', experience: '10 years coaching', initials: 'JL', color: 'blue', image: 'photo-1534438327276-14e5300c3a48' },
]

export const plans = [
  { name: 'Essential', price: '39', period: 'month', description: 'Your foundation for showing up.', features: ['Full gym floor access', 'Locker room & showers', 'Fitness assessment'], featured: false },
  { name: 'Performance', price: '69', period: 'month', description: 'More coaching. More momentum.', features: ['Everything in Essential', '4 group classes each month', 'Monthly coach check-in', 'Recovery zone access'], featured: true },
  { name: 'Unlimited', price: '99', period: 'month', description: 'Your goals, without limits.', features: ['Everything in Performance', 'Unlimited group classes', '2 personal training sessions', 'Guest passes each month'], featured: false },
]

export const memberBookings = [
  { title: 'Strength foundations', type: 'Small group training', date: 'Today, 6:30 PM', coach: 'Marcus Reed', status: 'Confirmed' },
  { title: 'Mobility reset', type: 'Recovery class', date: 'Thursday, 7:00 AM', coach: 'Sofia Bennett', status: 'Confirmed' },
  { title: 'Performance circuit', type: 'Group training', date: 'Saturday, 10:00 AM', coach: 'Jordan Lee', status: 'Waitlist' },
]

export const members = [
  { name: 'Avery Morgan', email: 'avery.morgan@email.com', plan: 'Performance', status: 'Active', since: 'Jan 12, 2025' },
  { name: 'Taylor Brooks', email: 'taylor.brooks@email.com', plan: 'Unlimited', status: 'Active', since: 'Feb 03, 2025' },
  { name: 'Casey Rivera', email: 'casey.rivera@email.com', plan: 'Essential', status: 'Paused', since: 'Mar 18, 2025' },
  { name: 'Riley Chen', email: 'riley.chen@email.com', plan: 'Performance', status: 'Active', since: 'Apr 02, 2025' },
]

export const adminActivity = [
  { title: 'New member registration', detail: 'Taylor Brooks · Unlimited plan', time: '12 min ago', initials: 'TB' },
  { title: 'Booking completed', detail: 'Strength foundations · Marcus Reed', time: '38 min ago', initials: 'SF' },
  { title: 'Enquiry received', detail: 'Personal training availability', time: '1 hr ago', initials: 'EN' },
]
