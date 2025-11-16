
import type { LucideIcon } from 'lucide-react';
import { Coins, Crown as MonarchIcon, HelpingHand, Flame, Scale, Baby, Droplet, HelpCircle, HandCoins, KeySquare, Wand2, Wheat } from 'lucide-react';

export interface Character {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  imageUrl: string;
  dataAiHint?: string; // For placeholder images
}

export const CHARACTERS_LIST: Character[] = [
  {
    id: 'thief',
    name: 'The Thief',
    description: "The name says it all. This scoundrel will try to steal money from fellow players by robbing a character type. But beware, if there are multiple thieves in a round, they all lose half their money to the jackpot and they don't get to steal from anyone! The Thief must choose their target character type when they select The Thief role.",
    icon: HandCoins,
    imageUrl: '/thief.png',
    dataAiHint: 'thief character',
  },
  {
    id: 'merchant',
    name: 'The Merchant',
    description: "The Merchant is the cunning big earner. Due to their smart investments, they will receive double daily coins at the start of the next day. There is no penalty for having multiple Merchants in a round.",
    icon: Coins,
    imageUrl: '/merchant.png',
    dataAiHint: 'merchant character',
  },
  {
    id: 'monarch',
    name: 'The Monarch',
    description: "They may choose an activity for the entire group for the next day. Everyone must participate without complaint. But beware, there can only be one Monarch. If there are multiple Monarchs, they must donate their entire fortune to the pot! (A Monarch has the great responsibility of guaranteeing the safety of his peasants. Therefore, if peasants get robbed, it is the monarchs responsibility to pay for any damages done. as compensation for the risk the monarch collects taxes from his peasants). This part is only in play if the peasant is selected to be in the game.",
    icon: MonarchIcon,
    imageUrl: '/monarch.png',
    dataAiHint: 'monarch character',
  },
  {
    id: 'saint',
    name: 'The Saint',
    description: "They diligently collect money for the pot but receive no reward. This noble act of self-sacrifice will double the amount in the pot if they are the only Saint! But if there are multiple Saints? That clashes! Then the money in the pot is halved, and each Saint must supplement the pot with a generous gift of up to 10 Coins from their daily earnings.",
    icon: HelpingHand,
    imageUrl: '/saint.png',
    dataAiHint: 'saint character',
  },
  {
    id: 'judge',
    name: 'The Judge',
    description: "Delivers verdicts, and their judgment is final. If they are the only Judge, they may select a player (including themselves) to receive an extra life for the endgame. If there are multiple Judges, they each lose a life!",
    icon: Scale,
    imageUrl: '/judge.png',
    dataAiHint: 'judge character',
  },
  {
    id: 'trickster',
    name: 'The Trickster',
    description: "Always knows how to turn luck to their favor. If they are the only Trickster, their submitted hunch for the day's challenge will be adjusted by 10% (up or down) to be closer to the actual result. If there are multiple Tricksters, they are disqualified from winning that round's challenge.",
    icon: Flame,
    imageUrl: '/trickster.png',
    dataAiHint: 'trickster character',
  },
  {
    id: 'prince',
    name: 'The Fat Prince',
    description: "Privilege is spoon-fed to them. The Prince may therefore skip an endgame round (not the finale), simply because they don't feel like it. But of course, there's only one favorite. If multiple Princes are chosen, it leads to a quarrel, and they must each lose two lives as punishment.",
    icon: Baby,
    imageUrl: '/prince.png',
    dataAiHint: 'prince character',
  },
  {
    id: 'magician',
    name: 'The Magician',
    description: "If they are the only Magician, they can choose a player and force them to pick a character of the Magician's choice on the next day. This power costs a dice roll; half the roll (rounded up) is paid to the jackpot. If multiple Magicians are chosen, they each pay a cost to the jackpot based on their own dice roll.",
    icon: Wand2,
    imageUrl: '/magician.png',
    dataAiHint: 'magician character',
  },
  {
    id: 'peasant',
    name: 'The Peasant',
    description: "peasants stand strong together. That is why they will be rewarded when with many, but punished when standing alone. The peasants will be granted protection by the monarch from any petty thievery, However that service doesn't come for free. each peasant will pay a royal tax of two coins to the monarch. But make sure you don't stand alone in this quest! If you are the only peasant the monarch will take all your coins. No monarch or 2+ monarchs? the peasants tax of 2 coins will go to the jackpot instead, but no protection is granted.",
    icon: Wheat,
    imageUrl: '/peasant.png',
    dataAiHint: 'peasant character',
  },
  {
    id: 'decoy',
    name: 'The Decoy',
    description: "A sneaky one who cleverly manages to avoid the day's chores! But... If there are multiple Decoys? Then they get to do the chores together (ie: Do the dishes)!",
    icon: Droplet,
    imageUrl: '/decoy.png',
    dataAiHint: 'decoy character',
  },
];

// A default icon if a character's specified icon is somehow unavailable or for placeholders.
export const DEFAULT_CHARACTER_ICON: LucideIcon = HelpCircle;

// Order in which character effects are revealed and processed.
export const CHARACTER_REVEAL_ORDER: string[] = [
  'thief',
  'merchant',
  'peasant',
  'monarch',
  'saint',
  'judge',
  'magician',
  'trickster',
  'prince',
  'decoy',
];
