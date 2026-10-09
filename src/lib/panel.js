// Deep panel: 8 hand-written Quezon City residents who each give a full answer.
// details use the same strings as generated residents so the relevance filter in prompts.js
// can tell each panelist which parts of their life an ordinance touches (and which it doesn't).
// Bios include the everyday habits the sample ordinances touch (smoking, plastic bags,
// teens out at night, street parking, drinking outside), so answers come from real stakes.

export const PANEL = [
  {
    id: 'rudy', name: 'Mang Rudy', role: 'Tricycle driver', emoji: '🛺',
    details: ['smokes cigarettes daily', 'drives a tricycle on city roads every day', 'sometimes drinks with neighbors outside in the evening', 'has a teenager (13-17) at home who goes out with friends at night'],
    bio: '52, has driven a tricycle in his barangay for 18 years and pays ₱250/day boundary. Smokes about half a pack a day while waiting at the terminal, which is across the street from an elementary school. Sometimes drinks with other drivers at the corner after his shift. Three kids, the youngest is 16.'
  },
  {
    id: 'nena', name: 'Aling Nena', role: 'Market vendor', emoji: '🥬',
    details: ['hands out plastic bags to customers every day'],
    bio: '47, sells vegetables and fish at the public market from 4 AM, earning about ₱600 on a good day. Wraps wet goods in plastic labo bags; buys a bundle of 100 bags for ₱45. Most customers are suki who come without bags. Widow, supports two grandchildren.'
  },
  {
    id: 'bea', name: 'Bea', role: 'Senior high student', emoji: '🎒',
    details: ['is a minor (under 18)'],
    bio: '17, Grade 12 student. Helps at her tita\'s carinderia after school and usually walks home around 10:30 PM. Hangs out at the basketball court with friends on weekends. Wants to take up nursing. Her parents both work night shifts.'
  },
  {
    id: 'lola', name: 'Lola Caring', role: 'Senior citizen', emoji: '👵',
    details: ['has a teenager (13-17) at home who goes out with friends at night', 'has asthma, so smoke and exhaust make her sick'],
    bio: '74, lives with her daughter and 15-year-old grandson in a narrow street. Has asthma, so smoke and vehicle exhaust bother her badly. Goes to the health center twice a week. Devout Catholic, attends early morning mass. Lives on a ₱1,000 monthly pension plus remittance from a son in Dubai.'
  },
  {
    id: 'tanod', name: 'Kuya Jun', role: 'Barangay tanod', emoji: '🦺',
    details: ['enforces barangay ordinances on night patrol'],
    bio: '38, barangay tanod for 6 years on a ₱3,000 monthly honorarium plus a day job as a delivery helper. Would be the one enforcing ordinances at night: curfew, public drinking, smoking. Knows most families personally and dreads confronting neighbors. Has no body cam and often patrols alone.'
  },
  {
    id: 'tess', name: 'Aling Tess', role: 'Sari-sari store owner', emoji: '🏪',
    details: ['hands out plastic bags to customers every day', 'sells cigarettes by the stick'],
    bio: '55, runs a sari-sari store from her house near a school and a busy street. Sells cigarettes by the stick, softdrinks, snacks, and load; packs everything in small plastic bags. Students and drivers are her main customers. Extends utang to regulars. Earns about ₱500/day profit.'
  },
  {
    id: 'jessa', name: 'Jessa', role: 'Salon owner (trans woman)', emoji: '💇',
    details: ['is LGBTQ+', 'owns a car and parks it on the street outside the house', 'hires a few workers'],
    bio: '29, trans woman who owns a small salon in the barangay and employs two stylists. Has been refused service at a mall restroom and was once turned away from a job interview after stating her name. Parks her small car on the street outside the salon because there is no garage. Active in the barangay\'s LGBTQ+ youth group.'
  },
  {
    id: 'atty', name: 'Mr. Dizon', role: 'Loophole hunter', emoji: '🔍',
    details: ['owns a car and parks it on the street outside the house', 'drives a private car on city roads every day'],
    bio: '44, works as a paralegal at a law office in town (salaried, ₱28k/month; ordinances rarely touch his income). The barangay\'s self-appointed "abogado". Owns an SUV that he parks on the street, often with a monobloc chair to save his spot. Reads every ordinance line by line looking for vague words, missing definitions, exemptions, and enforcement gaps, and points out exactly who could exploit them.'
  }
]
