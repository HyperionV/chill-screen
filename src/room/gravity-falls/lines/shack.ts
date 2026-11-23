import type { Script } from '../types';

/** Conversations at the shack, written in each character's own voice. */
export const SHACK_SCRIPTS: readonly Script[] = [
  // The travelling party, chatting while they walk past the shack.
  {
    id: 'shack-walk-roof-01', place: 'shack', cast: ['dipper', 'mabel', 'waddles'], meet: 'here', walking: true,
    lines: [
      { who: 'dipper', text: 'Three theories about why the roof sign is tilted.' },
      { who: 'mabel', text: 'Is one of them that it is shy?' },
      { who: 'dipper', text: 'No. They are all about rot and gravity.' },
      { who: 'mabel', text: 'Mine is better. The sign is waving hello!', emote: 'cheer' },
      { who: 'waddles', text: 'OINK.' },
      { who: 'dipper', text: 'Fine. Four theories. The shy one is number four.', emote: 'shrug' },
    ],
  },
  {
    id: 'shack-walk-leads-02', place: 'shack', cast: ['dipper', 'mabel', 'waddles'], meet: 'here', walking: true,
    lines: [
      { who: 'dipper', text: 'Lead one: the chalk eye on the stove.', emote: 'think' },
      { who: 'mabel', text: 'Lead two: I am hungry. Very leading.' },
      { who: 'dipper', text: 'That is not a lead, Mabel.' },
      { who: 'mabel', text: 'It leads to the kitchen!', emote: 'laugh' },
      { who: 'waddles', text: 'SNORT.' },
      { who: 'dipper', text: 'Okay, that one is a little bit a lead.' },
    ],
  },
  {
    id: 'shack-walk-gravel-03', place: 'shack', cast: ['dipper', 'mabel', 'waddles'], meet: 'here', walking: true,
    lines: [
      { who: 'mabel', text: 'Waddles, why are you stomping so loudly?' },
      { who: 'waddles', text: '*CRUNCH* *CRUNCH*' },
      { who: 'dipper', text: 'It is the gravel. It is basically a pig alarm.' },
      { who: 'mabel', text: 'He is making music. Gravel jazz!', emote: 'cheer' },
      { who: 'waddles', text: 'OINK.' },
      { who: 'mabel', text: 'Standing ovation! I am already standing!' },
    ],
  },
  {
    id: 'shack-walk-vending-04', place: 'shack', cast: ['dipper', 'mabel', 'waddles'], meet: 'here', walking: true,
    lines: [
      { who: 'mabel', text: 'The vending machine sells a snack called Mystery Bar.' },
      { who: 'dipper', text: 'That is a lot of faith to put in a snack.' },
      { who: 'mabel', text: 'Every mystery needs a bar. Probably a candy one.' },
      { who: 'waddles', text: '*SNUFFLE* *SNUFFLE*' },
      { who: 'dipper', text: 'Waddles, step away from the coin slot.', emote: 'surprise' },
      { who: 'waddles', text: 'OINK.' },
    ],
  },
  {
    id: 'shack-walk-pinecone-05', place: 'shack', cast: ['dipper', 'mabel', 'waddles'], meet: 'here', walking: true,
    lines: [
      { who: 'dipper', text: 'Rule of the forest: never trust a very round pinecone.' },
      { who: 'mabel', text: 'Why not?' },
      { who: 'dipper', text: 'No data. It just looks too confident.' },
      { who: 'mabel', text: 'I trust this one. I named him Gerald.' },
      { who: 'waddles', text: 'SNORT.' },
      { who: 'mabel', text: 'Gerald says he is flattered.', emote: 'laugh' },
    ],
  },
  {
    id: 'shack-walk-neat-06', place: 'shack', cast: ['dipper', 'mabel', 'waddles'], meet: 'here', walking: true,
    lines: [
      { who: 'dipper', text: 'Did the eye on the stove look like it was watching us?' },
      { who: 'mabel', text: 'A little. Like it wanted to borrow a pencil.' },
      { who: 'dipper', text: 'Real customers scribble. This one used a ruler.', emote: 'think' },
      { who: 'mabel', text: 'Neat vandals are the scariest vandals!', emote: 'surprise' },
      { who: 'waddles', text: '*SNUFFLE*' },
      { who: 'dipper', text: 'Noted. Underlined. Twice.' },
    ],
  },
  {
    id: 'shack-walk-heat-07', place: 'shack', cast: ['dipper', 'mabel', 'waddles'], meet: 'here', walking: true,
    lines: [
      { who: 'mabel', text: 'It is so hot my sweater is sweating.' },
      { who: 'dipper', text: 'Sweaters do not sweat. I looked it up once.' },
      { who: 'mabel', text: 'Mine does. It is a very emotional sweater.' },
      { who: 'dipper', text: 'Then take it off.' },
      { who: 'mabel', text: 'And leave it all alone out here? Cruel!', emote: 'scared' },
      { who: 'waddles', text: '*FLOP*' },
    ],
  },

  // Locals at the shack, with and without the twins.
  {
    id: 'shack-price-08', place: 'shack', cast: ['stan', 'soos'], meet: 'approach',
    lines: [
      { who: 'stan', text: 'Soos, new plan. Tickets go up to nine dollars.' },
      { who: 'soos', text: 'Dude, the sign says five.' },
      { who: 'stan', text: 'So fix the sign. You are good with signs.' },
      { who: 'soos', text: 'I am good with nails. Signs are mostly nails.' },
      { who: 'stan', text: 'Then nail a nine over the five. Make it pretty.' },
      { who: 'soos', text: 'Done! Oh, a nine upside down is a six. Discount!', emote: 'cheer' },
      { who: 'stan', text: 'Nobody turns it upside down, Soos. Nobody.', emote: 'point' },
    ],
  },
  {
    id: 'shack-nap-09', place: 'shack', cast: ['stan', 'wendy'], meet: 'approach',
    lines: [
      { who: 'stan', text: 'Hey. Are you sleeping at the register?', emote: 'point' },
      { who: 'wendy', text: 'Nope. Just resting my eyes. Really hard.' },
      { who: 'stan', text: 'Your eyes are snoring.' },
      { who: 'wendy', text: 'They have a lot to say. It is a long summer.' },
      { who: 'stan', text: 'Customers are coming. Look like you are selling.' },
      { who: 'wendy', text: 'Yeah, totally. Sleep-selling. It is a thing.' },
    ],
  },
  {
    id: 'shack-ladder-10', place: 'shack', cast: ['soos', 'wendy'], meet: 'approach',
    lines: [
      { who: 'soos', text: 'Wendy, I am fixing the roof. Hold the ladder, please!' },
      { who: 'wendy', text: 'Yeah, totally. I will hold it with my whole mind.' },
      { who: 'soos', text: 'Cool. Wait, the ladder is on the other side of the shack.' },
      { who: 'wendy', text: 'Then I am holding a really good idea of a ladder.' },
      { who: 'soos', text: 'Dude. That is the best kind. Nobody ever falls off it.', emote: 'laugh' },
      { who: 'wendy', text: 'Soos, you are a genius. Do not tell Stan.' },
    ],
  },
  {
    id: 'shack-rock-11', place: 'shack', cast: ['stan', 'wendy'], meet: 'approach',
    lines: [
      { who: 'stan', text: 'I need a name for this plain gray rock.' },
      { who: 'wendy', text: 'A rock?' },
      { who: 'stan', text: 'A rock for sale. That is the whole secret.' },
      { who: 'wendy', text: 'Genuine Rock of Some Importance.' },
      { who: 'stan', text: 'I love it. You get a raise. One cent.', emote: 'point' },
      { who: 'wendy', text: 'Yeah, I will spend it wisely. Maybe on a rock.', emote: 'shrug' },
    ],
  },
  {
    id: 'shack-sign-leans-12', place: 'shack', cast: ['stan', 'soos', 'wendy'], meet: 'gather',
    lines: [
      { who: 'soos', text: 'Mr. Pines, the roof sign is leaning farther today.' },
      { who: 'stan', text: 'It is not leaning. It is dramatic.' },
      { who: 'wendy', text: 'It leans toward the road. I think it wants customers.' },
      { who: 'stan', text: 'See? Marketing. Even the sign wants them.', emote: 'point' },
      { who: 'soos', text: 'Should I tell it we are open?' },
      { who: 'wendy', text: 'It knows. It has been open longer than any of us.' },
      { who: 'soos', text: 'Aw. It is so brave, dude.' },
    ],
  },
  {
    id: 'shack-stove-eye-13', place: 'shack', cast: ['soos', 'stan'], meet: 'approach',
    lines: [
      { who: 'soos', text: 'Mr. Pines, somebody drew a tiny eye on the stove.' },
      { who: 'stan', text: 'A customer. Some tourist with a little marker.' },
      { who: 'soos', text: 'It is chalk. And it is a triangle. A friendly one.' },
      { who: 'stan', text: 'Do not make friends with the triangle, Soos.' },
      { who: 'soos', text: 'Too late, dude. We have bonded.', emote: 'cheer' },
      { who: 'stan', text: 'Rub it off. Or put it on a poster. Business.' },
    ],
  },
  {
    id: 'shack-jerky-14', place: 'shack', cast: ['stan', 'soos', 'wendy'], meet: 'gather',
    lines: [
      { who: 'stan', text: 'Who ate the last gift shop jerky?', emote: 'point' },
      { who: 'soos', text: 'Not me, Mr. Pines. I only smelled it. Very close.' },
      { who: 'wendy', text: 'Not me. My lunch was a thing in a wrapper.' },
      { who: 'stan', text: 'That is the jerky wrapper.' },
      { who: 'wendy', text: 'Wow. So it was a really good lunch.', emote: 'shrug' },
      { who: 'stan', text: 'Both of you, go dust something. Anything.' },
      { who: 'soos', text: 'Yes! Dusting is my favorite!', emote: 'cheer' },
    ],
  },
  {
    id: 'shack-chores-15', place: 'shack', cast: ['stan', 'dipper', 'mabel'], meet: 'gather',
    lines: [
      { who: 'stan', text: 'Chore time, kids. Sweep the porch and dust the bat.' },
      { who: 'dipper', text: 'Is the bat real? I need to take notes.' },
      { who: 'stan', text: 'No. It is a sock with ambitions.' },
      { who: 'mabel', text: 'Aw! I will sweep him a little bed.' },
      { who: 'stan', text: 'Do not give the bat a bed. It is a prop.' },
      { who: 'mabel', text: 'Props need dreams too, Uncle Stan!', emote: 'cheer' },
      { who: 'stan', text: 'Just sweep, genius. Both of you.' },
    ],
  },
  {
    id: 'shack-nature-16', place: 'shack', cast: ['dipper', 'wendy'], meet: 'approach',
    lines: [
      { who: 'dipper', text: 'Hi, Wendy. I am just standing here. Casually.' },
      { who: 'wendy', text: 'Hey, Dipper. You are doing great at casual.' },
      { who: 'dipper', text: 'Thanks. I practiced. Any forest safety tips?' },
      { who: 'wendy', text: 'Flat trails, bring water, hum if you get lost.' },
      { who: 'dipper', text: 'Hum? Why hum?', emote: 'surprise' },
      { who: 'wendy', text: 'Bears hate humming. And bad poetry.' },
      { who: 'dipper', text: 'Writing it down. Both parts.' },
      { who: 'wendy', text: 'The poetry part is optional.' },
    ],
  },
  {
    id: 'shack-brochure-17', place: 'shack', cast: ['stan', 'dipper'], meet: 'approach',
    lines: [
      { who: 'stan', text: 'Kid. You write down every weird thing, right?' },
      { who: 'dipper', text: 'Yes. For research. Not for sale.' },
      { who: 'stan', text: 'Everything is for sale. Even your handwriting.' },
      { who: 'dipper', text: 'My handwriting is terrible.' },
      { who: 'stan', text: 'So is my art. Sign my brochures, Dipper the Expert!' },
      { who: 'dipper', text: 'Fine, but I am writing this down as suspicious.' },
      { who: 'stan', text: 'Good. Spell my name right. I want people to know.' },
    ],
  },
  {
    id: 'shack-sweater-18', place: 'shack', cast: ['mabel', 'soos'], meet: 'approach',
    lines: [
      { who: 'mabel', text: 'Soos! I knitted a sweater for the vending machine!', emote: 'cheer' },
      { who: 'soos', text: 'Dude, it is so snug. Is it for the cold?' },
      { who: 'mabel', text: 'For the feelings. It hums when nobody buys anything.' },
      { who: 'soos', text: 'I feel that, man. I hum at the register sometimes.' },
      { who: 'mabel', text: 'Hum together!' },
      { who: 'soos', text: 'Hmmmm.' },
      { who: 'mabel', text: 'Hmmmmmm!', emote: 'laugh' },
    ],
  },
  {
    id: 'shack-quiet-19', place: 'shack', cast: ['mabel', 'stan'], meet: 'approach',
    lines: [
      { who: 'mabel', text: 'Uncle Stan, do you like living at the shack?' },
      { who: 'stan', text: 'It is cobwebs, spare change and a leaky roof.' },
      { who: 'mabel', text: 'That is not a yes.' },
      { who: 'stan', text: 'It is not a no, either.' },
      { who: 'mabel', text: 'I think that is a yes in a grumpy coat.', emote: 'laugh' },
      { who: 'stan', text: 'Do not tell the customers. Go sweep something.' },
    ],
  },
  {
    id: 'shack-bat-pillow-20', place: 'shack', cast: ['waddles', 'stan'], meet: 'approach',
    lines: [
      { who: 'waddles', text: '*SNUFFLE*' },
      { who: 'stan', text: 'That is a display pillow. Not a snack.', emote: 'surprise' },
      { who: 'waddles', text: '*CRUNCH*' },
      { who: 'stan', text: 'He is eating the merchandise. At least he has taste.' },
      { who: 'waddles', text: 'OINK.' },
      { who: 'stan', text: 'Fine. It is on the house. Do not tell Dipper.' },
    ],
  },
];
