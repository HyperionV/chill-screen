import type { Script } from '../types';

/** Conversations at the woods, written in each character's own voice. */
export const WOODS_SCRIPTS: readonly Script[] = [
  // The travelling party, chatting while they walk through the pines.
  {
    id: 'woods-walk-stump-01', place: 'woods', cast: ['dipper', 'mabel', 'waddles'], meet: 'here', walking: true,
    lines: [
      { who: 'dipper', text: 'The rings on this stump show a really bad drought year.' },
      { who: 'mabel', text: "Poor stump! Let's give it a hat." },
      { who: 'dipper', text: 'Mabel, you cannot give a stump a hat.' },
      { who: 'mabel', text: 'He wants a small one. Look at his face.', emote: 'point' },
      { who: 'dipper', text: 'I do not see a face.' },
      { who: 'mabel', text: 'That is because you do not look with feelings.' },
      { who: 'waddles', text: 'SNORT.' },
      { who: 'dipper', text: 'Waddles agrees with me. I think.' },
    ],
  },
  {
    id: 'woods-walk-eyes-02', place: 'woods', cast: ['dipper', 'mabel', 'waddles'], meet: 'here', walking: true,
    lines: [
      { who: 'dipper', text: 'Do not turn around, but the trees are blinking.', emote: 'scared' },
      { who: 'mabel', text: 'Oh no! Are they wearing sparkly eyeshadow?' },
      { who: 'dipper', text: 'Probably not. Count the pairs with me. One, two...' },
      { who: 'mabel', text: 'Seven! They all blink at once. So polite!' },
      { who: 'waddles', text: 'OINK.' },
      { who: 'dipper', text: 'Waddles, do not wave at the trees.', emote: 'surprise' },
      { who: 'mabel', text: 'Too late! They waved back with their eyebrows!', emote: 'cheer' },
    ],
  },
  {
    id: 'woods-walk-ring-03', place: 'woods', cast: ['dipper', 'mabel', 'waddles'], meet: 'here', walking: true,
    lines: [
      { who: 'mabel', text: 'A mushroom ring! Quick, everybody make a wish!', emote: 'cheer' },
      { who: 'dipper', text: 'Rule one of the woods: never step in the ring.' },
      { who: 'mabel', text: 'Rule two: I am already in the ring.' },
      { who: 'dipper', text: 'Okay. I am writing down what happens. Slowly.', emote: 'scared' },
      { who: 'mabel', text: 'Nothing! Except I feel a lot more charming.' },
      { who: 'waddles', text: '*SNUFFLE*' },
      { who: 'dipper', text: 'Waddles is sniffing a mushroom. This is an emergency.' },
      { who: 'mabel', text: 'Relax. He is just doing research. Like you!' },
    ],
  },
  {
    id: 'woods-walk-spy-04', place: 'woods', cast: ['dipper', 'mabel', 'waddles'], meet: 'here', walking: true,
    lines: [
      { who: 'mabel', text: 'I spy with my little eye something green!' },
      { who: 'dipper', text: 'Everything is green. It is a forest.' },
      { who: 'mabel', text: 'Wrong! It is a different green.' },
      { who: 'dipper', text: 'That is not a clue. That is a feeling.' },
      { who: 'mabel', text: 'The best clues are feelings.' },
      { who: 'waddles', text: 'OINK.' },
      { who: 'dipper', text: 'Fine. Is it the moss?' },
      { who: 'mabel', text: 'Yes! You are a mind reader!', emote: 'cheer' },
    ],
  },
  {
    id: 'woods-walk-sock-05', place: 'woods', cast: ['dipper', 'mabel', 'waddles'], meet: 'here', walking: true,
    lines: [
      { who: 'dipper', text: 'A sock on a branch. Just one. Striped.', emote: 'think' },
      { who: 'mabel', text: 'A single sock! That is a sad pirate flag.' },
      { who: 'dipper', text: 'I think it is a clue. Something is collecting them.' },
      { who: 'mabel', text: 'Maybe a very cold squirrel?' },
      { who: 'waddles', text: '*SNUFFLE*' },
      { who: 'dipper', text: 'Adding it to the list, under cold squirrels.' },
    ],
  },
  {
    id: 'woods-walk-whisper-06', place: 'woods', cast: ['dipper', 'mabel', 'waddles'], meet: 'here', walking: true,
    lines: [
      { who: 'mabel', text: 'Pine trees, tell me a secret!' },
      { who: 'dipper', text: 'Mabel, they do not talk.' },
      { who: 'mabel', text: 'Not yet.' },
      { who: 'waddles', text: 'OINK.' },
      { who: 'dipper', text: 'If one answers, I am going home. Immediately.', emote: 'scared' },
      { who: 'mabel', text: 'Shh. I think I heard a creak. Or a chuckle!', emote: 'surprise' },
      { who: 'dipper', text: 'That is a creak. It is just a creak.' },
    ],
  },
  {
    id: 'woods-walk-fork-07', place: 'woods', cast: ['dipper', 'mabel', 'waddles'], meet: 'here', walking: true,
    lines: [
      { who: 'dipper', text: 'Left or right? Two paths, one notebook, no map.' },
      { who: 'mabel', text: "Let's ask Waddles. Waddles, left or right?" },
      { who: 'waddles', text: 'SNORT.' },
      { who: 'mabel', text: 'He says straight on. Through the bush!', emote: 'point' },
      { who: 'dipper', text: 'That is not a path.' },
      { who: 'mabel', text: 'It is now! He is already in it.' },
      { who: 'waddles', text: '*THUD*' },
      { who: 'dipper', text: 'And now he is also stuck in it.', emote: 'shrug' },
    ],
  },

  // The gnomes among themselves, and the twins among the gnomes.
  {
    id: 'woods-beard-08', place: 'woods', cast: ['gnome-a', 'gnome-b'], meet: 'approach',
    lines: [
      { who: 'gnome-a', text: 'Your beard is one hair shorter than mine.' },
      { who: 'gnome-b', text: 'Liar. I measured it this morning with a twig.' },
      { who: 'gnome-a', text: 'A crooked twig. A biased twig.' },
      { who: 'gnome-b', text: 'At least my twig sits on a village committee.' },
      { who: 'gnome-a', text: 'Fine. We measure again at dawn. Bring witnesses.', emote: 'point' },
      { who: 'gnome-b', text: 'Bring snacks too. Witnesses get hungry.' },
    ],
  },
  {
    id: 'woods-hats-09', place: 'woods', cast: ['gnome-a', 'gnome-chief'], meet: 'approach',
    lines: [
      { who: 'gnome-chief', text: 'By decree, all hats shall now lean left.' },
      { who: 'gnome-a', text: 'Mine already leans left, Chief.' },
      { who: 'gnome-chief', text: 'Then it shall lean left harder.' },
      { who: 'gnome-a', text: 'How do I lean a hat harder?', emote: 'surprise' },
      { who: 'gnome-chief', text: 'With dignity! And a little glue.' },
      { who: 'gnome-a', text: 'Yes, Chief. Leaning with dignity.' },
    ],
  },
  {
    id: 'woods-ledger-10', place: 'woods', cast: ['gnome-b', 'gnome-chief'], meet: 'approach',
    lines: [
      { who: 'gnome-b', text: 'Chief, the sock ledger is missing a page again.' },
      { who: 'gnome-chief', text: 'Impossible. A ledger cannot lose a page.' },
      { who: 'gnome-b', text: 'It did. The last one. The one about the hill.' },
      { who: 'gnome-chief', text: 'Then the hill is erased. Nobody look at the hill.' },
      { who: 'gnome-b', text: 'That makes me want to look at the hill.' },
      { who: 'gnome-chief', text: 'Decree: nobody is curious. Except me.', emote: 'point' },
    ],
  },
  {
    id: 'woods-council-11', place: 'woods', cast: ['gnome-chief', 'gnome-a', 'gnome-b'], meet: 'gather',
    lines: [
      { who: 'gnome-chief', text: 'This council will now discuss the Great Mushroom Question.' },
      { who: 'gnome-a', text: 'Which question?' },
      { who: 'gnome-chief', text: 'Who sits on the biggest mushroom.' },
      { who: 'gnome-b', text: 'The best beard sits. So, me.' },
      { who: 'gnome-a', text: 'I demand a recount. Of beards.' },
      { who: 'gnome-chief', text: 'Decree: the biggest mushroom is sat on by me.' },
      { who: 'gnome-b', text: 'He changed the question!', emote: 'surprise' },
      { who: 'gnome-a', text: 'Politics!', emote: 'scared' },
    ],
  },
  {
    id: 'woods-swap-12', place: 'woods', cast: ['gnome-a', 'gnome-b'], meet: 'approach',
    lines: [
      { who: 'gnome-a', text: 'I will swap you two left socks for one right one.' },
      { who: 'gnome-b', text: 'Left socks are worth more. Politics.' },
      { who: 'gnome-a', text: 'Politics? It is wool!' },
      { who: 'gnome-b', text: 'Wool is politics.' },
      { who: 'gnome-a', text: 'That is the worst thing I ever heard. Deal.', emote: 'shrug' },
    ],
  },
  {
    id: 'woods-light-13', place: 'woods', cast: ['gnome-b', 'gnome-a'], meet: 'approach',
    lines: [
      { who: 'gnome-a', text: 'Look. The light came through the trees again.' },
      { who: 'gnome-b', text: 'Pretty. Do not tell the Chief I said that.' },
      { who: 'gnome-a', text: 'Your secret is safe. Under my hat.' },
      { who: 'gnome-b', text: 'That is the least safe place.' },
      { who: 'gnome-a', text: 'It is a very big hat.' },
    ],
  },
  {
    id: 'woods-parade-14', place: 'woods', cast: ['gnome-chief', 'gnome-a', 'gnome-b'], meet: 'gather',
    lines: [
      { who: 'gnome-chief', text: 'A parade will be held tomorrow to honor me.' },
      { who: 'gnome-a', text: 'What did you do, Chief?' },
      { who: 'gnome-chief', text: 'I woke up on time. Historic.' },
      { who: 'gnome-b', text: 'We have two drums and one very loud cough.' },
      { who: 'gnome-chief', text: 'Then the cough shall lead.', emote: 'point' },
      { who: 'gnome-a', text: 'I will practice my cough.', emote: 'cheer' },
    ],
  },
  {
    id: 'woods-pompom-15', place: 'woods', cast: ['mabel', 'gnome-a'], meet: 'approach',
    lines: [
      { who: 'mabel', text: 'Hello, tiny friend! May I give you a glitter hat?', emote: 'cheer' },
      { who: 'gnome-a', text: 'A hat? What kind of hat? Does it lean?' },
      { who: 'mabel', text: 'It leans a lot. It has a pom-pom.' },
      { who: 'gnome-a', text: 'A pom-pom. The Chief must never find out.' },
      { who: 'mabel', text: 'Everybody loves a pom-pom. Even chiefs!' },
      { who: 'gnome-a', text: 'Especially chiefs. Quiet. Hand it over.', emote: 'shrug' },
    ],
  },
  {
    id: 'woods-last-page-16', place: 'woods', cast: ['dipper', 'gnome-chief', 'gnome-a'], meet: 'gather',
    lines: [
      { who: 'dipper', text: 'Excuse me, sir. May I ask about the missing socks?' },
      { who: 'gnome-chief', text: 'Sock records belong to the village. They are sacred.' },
      { who: 'dipper', text: 'I only want to see the last page of your ledger.' },
      { who: 'gnome-chief', text: 'That page does not exist. It points at a hill.' },
      { who: 'dipper', text: 'Wait. Which hill?', emote: 'think' },
      { who: 'gnome-chief', text: 'Guard! Guard the page that does not exist!', emote: 'surprise' },
      { who: 'gnome-a', text: 'I am guarding! I do not know what I am guarding.', emote: 'scared' },
    ],
  },
  {
    id: 'woods-trade-17', place: 'woods', cast: ['dipper', 'mabel', 'gnome-b'], meet: 'gather',
    lines: [
      { who: 'dipper', text: 'May I ask you three questions? The first is about socks.' },
      { who: 'gnome-b', text: 'One question. And you must trade me a beard comb.' },
      { who: 'mabel', text: 'I have a comb! It is purple and has a unicorn.', emote: 'cheer' },
      { who: 'gnome-b', text: 'A purple comb. Accepted. Ask.' },
      { who: 'dipper', text: 'Why do the gnomes collect so many socks?' },
      { who: 'gnome-b', text: 'To keep our feet warm. Obviously. Goodbye.' },
      { who: 'dipper', text: 'That was it? Mabel, that was the whole mystery?', emote: 'shrug' },
      { who: 'mabel', text: 'Cozy mysteries are the best mysteries.' },
    ],
  },
];
