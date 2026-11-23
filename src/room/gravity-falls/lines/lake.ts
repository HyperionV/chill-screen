import type { Script } from '../types';

/** Conversations at the lake, written in each character's own voice. */
export const LAKE_SCRIPTS: readonly Script[] = [
  // The travelling party, chatting while they stroll along the dock and shore.
  {
    id: 'lake-walk-planks-01', place: 'lake', cast: ['dipper', 'mabel', 'waddles'], meet: 'here', walking: true,
    lines: [
      { who: 'dipper', text: 'This dock has forty-one planks. I counted twice.' },
      { who: 'mabel', text: 'Forty-one! That is a very friendly number.' },
      { who: 'dipper', text: 'It is a prime number. Friendly is not the word.' },
      { who: 'mabel', text: 'I will skip every second plank to be polite.', emote: 'cheer' },
      { who: 'waddles', text: '*THUD*' },
      { who: 'dipper', text: 'That was plank number nineteen. Noted.' },
    ],
  },
  {
    id: 'lake-walk-ripples-02', place: 'lake', cast: ['dipper', 'mabel', 'waddles'], meet: 'here', walking: true,
    lines: [
      { who: 'dipper', text: 'The ripples are going in a circle. Not a random one.', emote: 'think' },
      { who: 'mabel', text: 'Maybe a fish is learning to dance.' },
      { who: 'dipper', text: 'Or something big is drawing shapes under the dock.' },
      { who: 'mabel', text: 'A shy artist! Let us leave it a snack.' },
      { who: 'waddles', text: 'SNORT.' },
      { who: 'dipper', text: 'It is a four, then a one, then a nine. I think.', emote: 'surprise' },
    ],
  },
  {
    id: 'lake-walk-boat-03', place: 'lake', cast: ['dipper', 'mabel', 'waddles'], meet: 'here', walking: true,
    lines: [
      { who: 'mabel', text: 'Look at that rowboat! It is just begging for a crew.' },
      { who: 'dipper', text: 'It has a hole in it. About here.', emote: 'point' },
      { who: 'mabel', text: 'That is not a hole. That is a built-in drain!' },
      { who: 'waddles', text: 'OINK.' },
      { who: 'dipper', text: 'Waddles wants to be captain. I do not like this.' },
      { who: 'mabel', text: 'Captain Waddles! He will steer by smell.', emote: 'cheer' },
    ],
  },
  {
    id: 'lake-walk-frog-04', place: 'lake', cast: ['dipper', 'mabel', 'waddles'], meet: 'here', walking: true,
    lines: [
      { who: 'mabel', text: 'A frog! I name him Sir Gulp the Third.' },
      { who: 'dipper', text: 'Why the Third?' },
      { who: 'mabel', text: 'He has seen two other Sir Gulps. They did not make it.' },
      { who: 'dipper', text: 'That is oddly dark for a frog story.', emote: 'shrug' },
      { who: 'waddles', text: '*SNUFFLE*' },
      { who: 'mabel', text: 'Waddles says he is fine. Frogs are tough!' },
    ],
  },
  {
    id: 'lake-walk-skip-05', place: 'lake', cast: ['dipper', 'mabel', 'waddles'], meet: 'here', walking: true,
    lines: [
      { who: 'dipper', text: 'Skipping stones is just angle and velocity.' },
      { who: 'mabel', text: 'Skipping stones is just waving at the water.' },
      { who: 'dipper', text: 'Watch. Six skips. I calculated it.' },
      { who: 'waddles', text: '*SPLASH*' },
      { who: 'dipper', text: 'That was a rock. Where is my rock?', emote: 'surprise' },
      { who: 'mabel', text: 'The lake has a new friend. And a rock!', emote: 'laugh' },
    ],
  },
  {
    id: 'lake-walk-house-06', place: 'lake', cast: ['dipper', 'mabel', 'waddles'], meet: 'here', walking: true,
    lines: [
      { who: 'mabel', text: 'The lake house across the water has a fountain. For fish!' },
      { who: 'dipper', text: 'It has a dock bigger than our whole yard.' },
      { who: 'mabel', text: 'I bet they have a pool noodle for every day.' },
      { who: 'dipper', text: 'Please do not wave at the lake house.' },
      { who: 'mabel', text: 'Too late! I am waving with my whole sweater.', emote: 'cheer' },
      { who: 'waddles', text: 'OINK.' },
    ],
  },

  // The lake folk among themselves, and the twins at the water.
  {
    id: 'lake-fish-07', place: 'lake', cast: ['pacifica', 'wendy'], meet: 'approach',
    lines: [
      { who: 'pacifica', text: 'Ugh. Your fishing smells like a shoe.' },
      { who: 'wendy', text: "That is the bait. It is old gym sock. Works great." },
      { who: 'pacifica', text: 'My family has a cook who catches fish for us.' },
      { who: 'wendy', text: 'Cool. Does he have a hat that says I caught one?' },
      { who: 'pacifica', text: 'No. He has a hat that says Carl.', emote: 'shrug' },
      { who: 'wendy', text: 'Yeah, totally. Nice hat.' },
    ],
  },
  {
    id: 'lake-hello-08', place: 'lake', cast: ['wendy', 'lake-monster'], meet: 'approach',
    lines: [
      { who: 'wendy', text: 'Hey, big guy. Got a minute?' },
      { who: 'lake-monster', text: 'BLUB.' },
      { who: 'wendy', text: 'Yeah, I know. The tourists are loud this week.' },
      { who: 'lake-monster', text: 'GLORP.' },
      { who: 'wendy', text: 'Totally. I would hide under the dock too.', emote: 'shrug' },
      { who: 'lake-monster', text: '*BUBBLE*' },
      { who: 'wendy', text: 'Same time tomorrow? I will bring crackers.' },
    ],
  },
  {
    id: 'lake-brag-09', place: 'lake', cast: ['pacifica', 'lake-monster'], meet: 'approach',
    lines: [
      { who: 'pacifica', text: 'My house has twenty-two bathrooms. You live in a lake.' },
      { who: 'lake-monster', text: 'BLUB.' },
      { who: 'pacifica', text: 'And you are rude to answer when I am bragging.' },
      { who: 'lake-monster', text: '*BUBBLE*' },
      { who: 'pacifica', text: 'Okay. A little lonely at night over there. So what.', emote: 'shrug' },
      { who: 'lake-monster', text: 'GLORP.' },
      { who: 'pacifica', text: 'Do not tell anyone I said that.' },
    ],
  },
  {
    id: 'lake-snort-10', place: 'lake', cast: ['waddles', 'lake-monster'], meet: 'approach',
    lines: [
      { who: 'waddles', text: 'OINK.' },
      { who: 'lake-monster', text: 'BLUB?' },
      { who: 'waddles', text: 'SNORT.' },
      { who: 'lake-monster', text: 'GLORP.', react: { who: 'waddles', emote: 'surprise' } },
      { who: 'waddles', text: '*SNUFFLE*' },
      { who: 'lake-monster', text: '*BUBBLE*', emote: 'laugh' },
    ],
  },
  {
    id: 'lake-skip-11', place: 'lake', cast: ['wendy', 'pacifica', 'lake-monster'], meet: 'gather',
    lines: [
      { who: 'wendy', text: 'Hold the stone flat. Flick your wrist like this.' },
      { who: 'pacifica', text: 'I do not need lessons. I have a stone tutor.' },
      { who: 'wendy', text: 'Cool. Then show me.', emote: 'shrug' },
      { who: 'pacifica', text: 'One. Two. Three. Wait, that was a bubble?', emote: 'surprise' },
      { who: 'lake-monster', text: '*BUBBLE*', emote: 'cheer' },
      { who: 'wendy', text: 'The lake is helping. Nice.' },
      { who: 'pacifica', text: 'Fine. Maybe the lake is okay.' },
    ],
  },
  {
    id: 'lake-rowing-12', place: 'lake', cast: ['dipper', 'wendy', 'mabel'], meet: 'gather',
    lines: [
      { who: 'wendy', text: 'Keep your oars level. Slow and steady.' },
      { who: 'dipper', text: 'Slow, steady, level. Writing it down.' },
      { who: 'mabel', text: 'I am rowing! Look at me go in a tiny circle!', emote: 'cheer' },
      { who: 'wendy', text: 'That is not forward. That is a hobby.' },
      { who: 'dipper', text: 'Mabel, switch your left oar to your right.', emote: 'point' },
      { who: 'mabel', text: 'Both oars are on my left. I feel fancy.' },
      { who: 'wendy', text: 'Good enough. We are all doomed, but nicely.' },
    ],
  },
  {
    id: 'lake-invite-13', place: 'lake', cast: ['pacifica', 'dipper', 'mabel'], meet: 'gather',
    lines: [
      { who: 'pacifica', text: 'My lake house has a party tonight. You are not invited.' },
      { who: 'mabel', text: 'Aw! Will there be cake? Can I smell it from here?' },
      { who: 'pacifica', text: 'It is a very expensive cake. With a name.' },
      { who: 'dipper', text: 'What is the cake called?' },
      { who: 'pacifica', text: 'Gerald. He is from Paris. Do not ask.', emote: 'shrug' },
      { who: 'mabel', text: 'My pinecone is Gerald too! Cousins!', emote: 'surprise' },
      { who: 'pacifica', text: 'Please never speak to me again.' },
    ],
  },
  {
    id: 'lake-sunset-14', place: 'lake', cast: ['wendy', 'pacifica'], meet: 'approach',
    lines: [
      { who: 'wendy', text: 'You can sit here if you want. The dock is big.' },
      { who: 'pacifica', text: 'I do not sit on docks. They are damp.' },
      { who: 'wendy', text: 'Cool. Stand, then. The sky does the rest.' },
      { who: 'pacifica', text: '...It is kind of pretty. Do not say anything.' },
      { who: 'wendy', text: 'Nothing said. This is a quiet dock.' },
      { who: 'pacifica', text: 'Good. Fine. Thank you.' },
    ],
  },
  {
    id: 'lake-notebook-15', place: 'lake', cast: ['dipper', 'lake-monster'], meet: 'approach',
    lines: [
      { who: 'dipper', text: 'Hi. I am Dipper. I keep a notebook. Is that okay?' },
      { who: 'lake-monster', text: 'BLUB.' },
      { who: 'dipper', text: 'You swim in a number. Four, one, nine. Why?', emote: 'think' },
      { who: 'lake-monster', text: 'GLORP.' },
      { who: 'dipper', text: 'Are you guarding something? Or just lonely?' },
      { who: 'lake-monster', text: '*BUBBLE*' },
      { who: 'dipper', text: 'I will write both. And a small drawing of you.', emote: 'laugh' },
    ],
  },
  {
    id: 'lake-friend-16', place: 'lake', cast: ['mabel', 'lake-monster'], meet: 'approach',
    lines: [
      { who: 'mabel', text: 'Hi, long friend! I brought you a sandwich.', emote: 'cheer' },
      { who: 'lake-monster', text: 'BLUB.' },
      { who: 'mabel', text: 'It is peanut butter and a little glitter.' },
      { who: 'lake-monster', text: '*BUBBLE*' },
      { who: 'mabel', text: 'You do not have to share it. I will sit with you.' },
      { who: 'lake-monster', text: 'Hi.' },
      { who: 'mabel', text: 'Hi! Best day ever. Quietly.', emote: 'laugh' },
    ],
  },
];
