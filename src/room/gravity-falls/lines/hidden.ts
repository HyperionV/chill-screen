import type { Script } from '../types';

/** Conversations in the hidden hollow, written in each character's own voice. */
export const HIDDEN_SCRIPTS: readonly Script[] = [
  // The travelling party, chatting while they walk through the twilight clearing.
  {
    id: 'hidden-walk-stars-01', place: 'hidden', cast: ['dipper', 'mabel', 'waddles'], meet: 'here', walking: true,
    lines: [
      { who: 'dipper', text: 'The stars are out. Thirty-one visible so far.' },
      { who: 'mabel', text: 'Look, that one is shaped like a sandwich.' },
      { who: 'dipper', text: 'That is a very hungry constellation.' },
      { who: 'mabel', text: 'I will name it Sandwich-ius. Official!', emote: 'cheer' },
      { who: 'waddles', text: 'OINK.' },
      { who: 'dipper', text: 'Fine. Sandwich-ius goes in the notebook.' },
    ],
  },
  {
    id: 'hidden-walk-roots-02', place: 'hidden', cast: ['dipper', 'mabel', 'waddles'], meet: 'here', walking: true,
    lines: [
      { who: 'dipper', text: 'These roots look like they are holding something.', emote: 'think' },
      { who: 'mabel', text: 'A hug! The hill is getting a hug.' },
      { who: 'dipper', text: 'A hug with a lot of knots. Careful, Waddles.' },
      { who: 'waddles', text: '*THUD*' },
      { who: 'mabel', text: 'He tripped. The hill giggled a little.' },
      { who: 'dipper', text: 'Hills do not giggle. I am writing it anyway.', emote: 'shrug' },
    ],
  },
  {
    id: 'hidden-walk-round-03', place: 'hidden', cast: ['dipper', 'mabel', 'waddles'], meet: 'here', walking: true,
    lines: [
      { who: 'mabel', text: 'That bump in the hill is perfectly round.' },
      { who: 'dipper', text: 'Nature does not make perfect circles. Mostly.' },
      { who: 'mabel', text: 'Maybe it is a very polite hill.', emote: 'point' },
      { who: 'waddles', text: '*SNUFFLE*' },
      { who: 'dipper', text: 'Waddles is sniffing it. Waddles has a good nose.' },
      { who: 'mabel', text: 'He says it smells like secrets and mud.' },
    ],
  },
  {
    id: 'hidden-walk-count-04', place: 'hidden', cast: ['dipper', 'mabel', 'waddles'], meet: 'here', walking: true,
    lines: [
      { who: 'dipper', text: 'An eye. A pine. A star. A question mark.', emote: 'think' },
      { who: 'mabel', text: 'That is the best sticker collection ever.' },
      { who: 'dipper', text: 'They are not stickers. They are marks. Someone made them.' },
      { who: 'mabel', text: 'Then someone has excellent taste in shapes.' },
      { who: 'waddles', text: 'SNORT.' },
      { who: 'dipper', text: 'We need one more. I can feel it. Near here.' },
    ],
  },
  {
    id: 'hidden-walk-quiet-05', place: 'hidden', cast: ['dipper', 'mabel', 'waddles'], meet: 'here', walking: true,
    lines: [
      { who: 'mabel', text: 'Dipper, do you ever wish summer would just stop?' },
      { who: 'dipper', text: 'Sometimes. When it is quiet like this.' },
      { who: 'mabel', text: 'Me too. But then we would miss all the next stuff.' },
      { who: 'waddles', text: '*SNUFFLE*' },
      { who: 'dipper', text: 'Good point. Waddles seems to agree.' },
      { who: 'mabel', text: 'Okay. Quiet is nice. Let us walk quietly.', emote: 'cheer' },
    ],
  },
  {
    id: 'hidden-walk-firefly-06', place: 'hidden', cast: ['dipper', 'mabel', 'waddles'], meet: 'here', walking: true,
    lines: [
      { who: 'mabel', text: 'Fireflies! They are tiny lamps with opinions.' },
      { who: 'dipper', text: 'They blink in patterns. Like a code.' },
      { who: 'mabel', text: 'Maybe they are saying hello in lightbulb.' },
      { who: 'waddles', text: 'OINK.' },
      { who: 'dipper', text: 'Waddles, do not eat the code.', emote: 'surprise' },
      { who: 'mabel', text: 'Hello! Hello! Hello! That is my whole message.', emote: 'laugh' },
    ],
  },

  // Bill, Stan and Soos among themselves, and the twins with them.
  {
    id: 'hidden-rent-07', place: 'hidden', cast: ['stan', 'bill'], meet: 'approach',
    lines: [
      { who: 'stan', text: 'Hey, triangle. You are on my hill. Rent is due.' },
      { who: 'bill', text: 'Rent? In my dimension, hills pay ME.' },
      { who: 'stan', text: 'Then get your dimension to cover a gift shop.' },
      { who: 'bill', text: 'Oh, how adorable. A man with a coupon book.', emote: 'laugh' },
      { who: 'stan', text: 'Coupons are the language of power, pal.', emote: 'point' },
      { who: 'bill', text: 'I will think about it. For a few minutes. Eternal ones.' },
    ],
  },
  {
    id: 'hidden-soos-bill-08', place: 'hidden', cast: ['soos', 'bill'], meet: 'approach',
    lines: [
      { who: 'soos', text: 'Whoa. Hey, you are a shape. Like, a real one.' },
      { who: 'bill', text: 'Three sides. One eye. Infinite style.' },
      { who: 'soos', text: 'Dude, that is exactly my dream outfit.' },
      { who: 'bill', text: 'Gasp. A fan. How very... basic.', emote: 'laugh' },
      { who: 'soos', text: 'Do you need a ride home? I have a truck.' },
      { who: 'bill', text: 'I live in a number. But thank you, large friend.' },
    ],
  },
  {
    id: 'hidden-hatboy-09', place: 'hidden', cast: ['bill', 'dipper'], meet: 'approach',
    lines: [
      { who: 'bill', text: 'Well, well. If it is hat boy and his tiny notebook.' },
      { who: 'dipper', text: 'It is a cap. And the notebook is very regular-sized.' },
      { who: 'bill', text: 'Cute. You collect marks. I collect... numbers.' },
      { who: 'dipper', text: 'Which numbers?', emote: 'think' },
      { who: 'bill', text: 'Ones you will not ask until it is much too late.' },
      { who: 'dipper', text: 'That is not helpful. It is just dramatic.', emote: 'shrug' },
    ],
  },
  {
    id: 'hidden-queen-10', place: 'hidden', cast: ['bill', 'mabel'], meet: 'approach',
    lines: [
      { who: 'bill', text: 'Behold, sweater queen. A triangle of great power.' },
      { who: 'mabel', text: 'Ooh! You are so shiny! Can I make you a scarf?' },
      { who: 'bill', text: 'I have no neck. I am a shape.' },
      { who: 'mabel', text: 'A triangle scarf! Three pointy corners! Genius!', emote: 'cheer' },
      { who: 'bill', text: 'That is... irritatingly clever.' },
      { who: 'mabel', text: 'I know! It is my superpower. Along with glitter.' },
    ],
  },
  {
    id: 'hidden-lantern-11', place: 'hidden', cast: ['stan', 'soos'], meet: 'approach',
    lines: [
      { who: 'stan', text: 'Soos, why am I standing on a hill at night?' },
      { who: 'soos', text: 'You said the kids might need help, Mr. Pines.' },
      { who: 'stan', text: 'I said that? Out loud? Where anyone could hear?' },
      { who: 'soos', text: 'Yeah, dude. It was in the car. It was very sweet.' },
      { who: 'stan', text: 'Forget it. Hold the lantern. Not like that.', emote: 'point' },
      { who: 'soos', text: 'It is okay. I held it with my heart.' },
    ],
  },
  {
    id: 'hidden-trio-12', place: 'hidden', cast: ['bill', 'stan', 'soos'], meet: 'gather',
    lines: [
      { who: 'bill', text: 'Gentlemen. Three of us, one hill, zero patience.' },
      { who: 'stan', text: 'Speak for yourself. I have all the patience. Hurry up.' },
      { who: 'soos', text: 'This is like a meeting where nobody has snacks.' },
      { who: 'bill', text: 'I am going to say something dramatic. Brace yourselves.' },
      { who: 'stan', text: 'Just say it. My knees are old.', emote: 'shrug' },
      { who: 'bill', text: 'Never mind. The moment has passed.', emote: 'laugh' },
      { who: 'soos', text: 'Man, I felt that one in my stomach.' },
    ],
  },
  {
    id: 'hidden-triangle-13', place: 'hidden', cast: ['dipper', 'mabel', 'bill'], meet: 'gather',
    lines: [
      { who: 'bill', text: 'I have a riddle. What is nine plus ten plus four?' },
      { who: 'dipper', text: 'Twenty-three. Why do you want to know?' },
      { who: 'mabel', text: 'It is the age of a very old cheese.', emote: 'cheer' },
      { who: 'bill', text: 'Wrong. Both of you. But I appreciate the energy.' },
      { who: 'dipper', text: 'Then what is the right answer?', emote: 'think' },
      { who: 'bill', text: 'Oh, it is a good one. Find the last mark first.' },
      { who: 'mabel', text: 'He is being mysterious. Gold star for him!' },
    ],
  },
  {
    id: 'hidden-uncle-14', place: 'hidden', cast: ['stan', 'dipper', 'mabel'], meet: 'gather',
    lines: [
      { who: 'stan', text: 'There you are. It is past dinner, you two.' },
      { who: 'dipper', text: 'Uncle Stan! We found something. It is very important.' },
      { who: 'stan', text: 'Is it a coupon? A mystery? A coupon for a mystery?' },
      { who: 'mabel', text: 'A hill with a secret under it. Are you mad?', emote: 'surprise' },
      { who: 'stan', text: 'Mad? I brought a flashlight. And a sandwich.' },
      { who: 'dipper', text: 'You came all the way up here for us?', emote: 'think' },
      { who: 'stan', text: 'Shut up and eat the sandwich, genius.' },
    ],
  },
  {
    id: 'hidden-profound-15', place: 'hidden', cast: ['soos', 'dipper'], meet: 'approach',
    lines: [
      { who: 'soos', text: 'Dude, I think a door is just a wall with an idea.' },
      { who: 'dipper', text: 'That is... actually, kind of right.', emote: 'think' },
      { who: 'soos', text: 'And a key is the idea telling you it is okay.' },
      { who: 'dipper', text: 'We have four symbols. We need all five.' },
      { who: 'soos', text: 'Then the last one is just a really shy symbol.' },
      { who: 'dipper', text: 'Soos, that might be the smartest thing today.' },
    ],
  },
  {
    id: 'hidden-pig-16', place: 'hidden', cast: ['waddles', 'bill'], meet: 'approach',
    lines: [
      { who: 'waddles', text: 'OINK.' },
      { who: 'bill', text: 'A pig. In a dimension I did not order.' },
      { who: 'waddles', text: '*SNUFFLE*' },
      { who: 'bill', text: 'Please do not sniff the eye. It is very expensive.' },
      { who: 'waddles', text: 'SNORT.', react: { who: 'bill', emote: 'surprise' } },
      { who: 'bill', text: 'Rude. Brilliant. Also rude.' },
    ],
  },
];
