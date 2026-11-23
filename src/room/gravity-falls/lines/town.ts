import type { Script } from '../types';

/** Conversations in town, written in each character's own voice. */
export const TOWN_SCRIPTS: readonly Script[] = [
  // The travelling party, chatting while they stroll down Main Street.
  {
    id: 'town-walk-hum-01', place: 'town', cast: ['dipper', 'mabel', 'waddles'], meet: 'here', walking: true,
    lines: [
      { who: 'dipper', text: 'Listen. The water tower is humming. In threes.', emote: 'think' },
      { who: 'mabel', text: 'It is singing to itself! Quick, harmonize!' },
      { who: 'dipper', text: 'It is more of a four, a one, then a nine.' },
      { who: 'mabel', text: 'That is the worst song. I love it.', emote: 'cheer' },
      { who: 'waddles', text: 'OINK.' },
      { who: 'dipper', text: 'Writing down the numbers. Again.' },
    ],
  },
  {
    id: 'town-walk-motto-02', place: 'town', cast: ['dipper', 'mabel', 'waddles'], meet: 'here', walking: true,
    lines: [
      { who: 'mabel', text: 'The town needs a motto. Something bold and sparkly.' },
      { who: 'dipper', text: 'It already has one. It is on the sign.' },
      { who: 'mabel', text: 'Mine is better: Come for the pie, stay for the pie.' },
      { who: 'dipper', text: 'That is just the same pie twice.' },
      { who: 'mabel', text: 'Double pie is a lifestyle!', emote: 'cheer' },
      { who: 'waddles', text: 'SNORT.' },
    ],
  },
  {
    id: 'town-walk-lamp-03', place: 'town', cast: ['dipper', 'mabel', 'waddles'], meet: 'here', walking: true,
    lines: [
      { who: 'waddles', text: '*SNUFFLE*' },
      { who: 'dipper', text: 'Waddles is scratching his back on a lamp post.' },
      { who: 'mabel', text: 'The lamp post looks so honored.' },
      { who: 'dipper', text: 'It is bolted down. It has no choice.' },
      { who: 'waddles', text: 'OINK.', react: { who: 'mabel', emote: 'laugh' } },
      { who: 'mabel', text: 'Now it is a pig-approved lamp post. Official!' },
    ],
  },
  {
    id: 'town-walk-shops-04', place: 'town', cast: ['dipper', 'mabel', 'waddles'], meet: 'here', walking: true,
    lines: [
      { who: 'mabel', text: 'Dipper, that shop sells a hat shaped like a hat.' },
      { who: 'dipper', text: 'Every hat is shaped like a hat.' },
      { who: 'mabel', text: 'Not like this one. This one is very hatty.', emote: 'point' },
      { who: 'dipper', text: 'We have four dollars. And a plan to save it.' },
      { who: 'mabel', text: 'Plans are just wishes in a coat.' },
      { who: 'waddles', text: '*CRUNCH*' },
      { who: 'dipper', text: 'Waddles, put the hat down. Slowly.', emote: 'surprise' },
    ],
  },
  {
    id: 'town-walk-pigeon-05', place: 'town', cast: ['dipper', 'mabel', 'waddles'], meet: 'here', walking: true,
    lines: [
      { who: 'dipper', text: 'That pigeon has been on the same wire all day.', emote: 'think' },
      { who: 'mabel', text: 'Maybe he likes the view. Or the wire.' },
      { who: 'dipper', text: 'Or he is a lookout. For someone.' },
      { who: 'mabel', text: 'A lookout pigeon! He needs a tiny clipboard.' },
      { who: 'waddles', text: 'OINK.' },
      { who: 'dipper', text: 'Adding it to my list. Number six, pigeons.' },
    ],
  },
  {
    id: 'town-walk-map-06', place: 'town', cast: ['dipper', 'mabel', 'waddles'], meet: 'here', walking: true,
    lines: [
      { who: 'dipper', text: 'I mapped the whole town. Every alley and shortcut.' },
      { who: 'mabel', text: 'I drew hearts on your map. Where the good snacks are.' },
      { who: 'dipper', text: 'Those were property lines!', emote: 'surprise' },
      { who: 'mabel', text: 'Now they are snack lines. Much friendlier.' },
      { who: 'waddles', text: '*SNUFFLE*' },
      { who: 'dipper', text: 'Fine. The heart on the bakery stays.', emote: 'shrug' },
    ],
  },

  // Townsfolk among themselves, and the twins among the townsfolk.
  {
    id: 'town-donut-07', place: 'town', cast: ['blubs', 'durland'], meet: 'approach',
    lines: [
      { who: 'blubs', text: 'Durland, there were six donuts in this box.' },
      { who: 'durland', text: 'Yes sir! Now there are zero! I counted!' },
      { who: 'blubs', text: 'I did not ask for a count. I asked where they went.' },
      { who: 'durland', text: 'Oh. They went into me. It was a team effort.' },
      { who: 'blubs', text: 'Of course it was.', emote: 'shrug' },
      { who: 'durland', text: 'I am real proud of my part, sir.' },
    ],
  },
  {
    id: 'town-special-08', place: 'town', cast: ['mcgucket', 'susan'], meet: 'approach',
    lines: [
      { who: 'susan', text: 'Morning, Mr. McGucket. Today the special is soup.' },
      { who: 'mcgucket', text: 'Soup, huh. Soup is just sad tea with ideas.' },
      { who: 'susan', text: 'Same order as always? Pie and a glass of water?' },
      { who: 'mcgucket', text: 'And a bolt. For the pie. It was a quiet bolt, but...' },
      { who: 'susan', text: 'A side of bolts, coming up. Nobody judges here.' },
      { who: 'mcgucket', text: 'Wait. Did I leave the oven on? In 1983?', emote: 'surprise' },
    ],
  },
  {
    id: 'town-poster-09', place: 'town', cast: ['gideon', 'susan'], meet: 'approach',
    lines: [
      { who: 'gideon', text: 'Miss Susan! May I hang my poster in your window?' },
      { who: 'susan', text: 'Of course, sweetheart. What is it for?' },
      { who: 'gideon', text: 'A grand show, starring none other than me.' },
      { who: 'susan', text: 'Lovely. I will put it up next to the pie.', emote: 'cheer' },
      { who: 'gideon', text: 'Next to the pie? Gideon deserves the middle!' },
      { who: 'susan', text: 'The middle is for the soup of the day, dear.' },
    ],
  },
  {
    id: 'town-snob-10', place: 'town', cast: ['pacifica', 'gideon'], meet: 'approach',
    lines: [
      { who: 'pacifica', text: 'Nice jacket. Did it come in your size? Oh wait.' },
      { who: 'gideon', text: 'It was made for me by the finest tailor in three states.' },
      { who: 'pacifica', text: 'Ours has his own tailor. His name is Carl.' },
      { who: 'gideon', text: 'Gideon has TWO tailors. Carl and Other Carl!', emote: 'point' },
      { who: 'pacifica', text: 'Impressive. Honestly, a little sad.' },
      { who: 'gideon', text: 'That is... that is not what I meant to hear.', emote: 'surprise' },
    ],
  },
  {
    id: 'town-hat-11', place: 'town', cast: ['blubs', 'durland', 'mcgucket'], meet: 'gather',
    lines: [
      { who: 'blubs', text: 'There is a hat on top of the lamp post. Whose?' },
      { who: 'durland', text: 'I did not put it there, sir. I just own it.' },
      { who: 'mcgucket', text: 'That hat has been up there since... a while.' },
      { who: 'blubs', text: 'Then it is a jurisdiction problem.', emote: 'think' },
      { who: 'mcgucket', text: 'Hats do not have jurisdiction. They have heads.' },
      { who: 'durland', text: 'I will climb up and ask it!', emote: 'cheer' },
      { who: 'blubs', text: 'Nobody climbs anything. I want a quiet shift.' },
    ],
  },
  {
    id: 'town-order-12', place: 'town', cast: ['susan', 'blubs', 'durland'], meet: 'gather',
    lines: [
      { who: 'susan', text: "Sheriff Blubs, the usual? Black coffee, two donuts?" },
      { who: 'blubs', text: 'Just the coffee today. Doctor says I should try.' },
      { who: 'durland', text: 'I will have what the sheriff is not having!' },
      { who: 'susan', text: 'So two donuts, Durland? Coming right up.' },
      { who: 'blubs', text: 'Make it one donut. For the department.', emote: 'shrug' },
      { who: 'durland', text: 'Best day ever, sir.' },
    ],
  },
  {
    id: 'town-gadget-13', place: 'town', cast: ['dipper', 'mabel', 'mcgucket'], meet: 'gather',
    lines: [
      { who: 'mcgucket', text: 'See this? A machine that sorts socks by feeling.' },
      { who: 'dipper', text: 'Interesting. Does it work?' },
      { who: 'mcgucket', text: 'Ask the machine. Hey, machine, do you work?' },
      { who: 'mabel', text: 'It blinked! It said maybe!', emote: 'cheer' },
      { who: 'mcgucket', text: 'Everything is a maybe if you wait long enough.' },
      { who: 'dipper', text: 'That sounds like nonsense. Also a little true.', emote: 'think' },
      { who: 'mabel', text: 'Cozy nonsense is the best nonsense!' },
    ],
  },
  {
    id: 'town-glitter-14', place: 'town', cast: ['mabel', 'pacifica'], meet: 'approach',
    lines: [
      { who: 'mabel', text: 'Pacifica! I made you a friendship bracelet. It has glitter!' },
      { who: 'pacifica', text: 'Ew. I do not wear things I did not buy.' },
      { who: 'mabel', text: 'You did not buy this either. That is the magic.' },
      { who: 'pacifica', text: 'It is... kind of shiny.', emote: 'think' },
      { who: 'mabel', text: 'The shiny is the best part. Please? Pretty please?' },
      { who: 'pacifica', text: 'Fine. Not because I like it. Because it is shiny.', emote: 'shrug' },
    ],
  },
  {
    id: 'town-tower-15', place: 'town', cast: ['dipper', 'mcgucket'], meet: 'approach',
    lines: [
      { who: 'dipper', text: 'Mr. McGucket, do you know why the water tower hums?' },
      { who: 'mcgucket', text: 'Because the water is thinking. Fast, then slow.' },
      { who: 'dipper', text: 'Thinking about what?' },
      { who: 'mcgucket', text: 'Numbers. Always numbers. Four... something... nine.' },
      { who: 'dipper', text: 'Four-one-nine? That is what I wrote down!', emote: 'surprise' },
      { who: 'mcgucket', text: 'Then you and the tower agree. Spooky.' },
    ],
  },
  {
    id: 'town-permit-16', place: 'town', cast: ['gideon', 'blubs'], meet: 'approach',
    lines: [
      { who: 'gideon', text: 'Sheriff, I need a permit for a very large balloon.' },
      { who: 'blubs', text: 'How large?' },
      { who: 'gideon', text: 'Gideon-sized. Times twelve. With my face on it.' },
      { who: 'blubs', text: 'Fill out form nine. In triplicate. Use a pen.' },
      { who: 'gideon', text: 'Gideon does not do paperwork. He does legends!', emote: 'point' },
      { who: 'blubs', text: 'Legends need form nine, too.', emote: 'shrug' },
    ],
  },
  {
    id: 'town-badge-17', place: 'town', cast: ['durland', 'susan'], meet: 'approach',
    lines: [
      { who: 'durland', text: 'Miss Susan, look! I polished my badge today!' },
      { who: 'susan', text: 'It shines like a little sun, Durland.' },
      { who: 'durland', text: 'That is because I used butter. Is that okay?' },
      { who: 'susan', text: 'Oh dear. Well, it does smell wonderful.' },
      { who: 'durland', text: 'I am going to guard the town, one pastry at a time!', emote: 'cheer' },
      { who: 'susan', text: 'The pie is the whole town, honey. Guard away.' },
    ],
  },
];
