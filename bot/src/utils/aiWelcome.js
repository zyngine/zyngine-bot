const Anthropic = require('@anthropic-ai/sdk');

const celebrities = [
  {
    name: 'Morgan Freeman',
    description: 'Legendary actor known for his deep, calming voice and narration',
    style: 'Speak in a warm, wise, grandfatherly tone. Use thoughtful pauses (indicated by "..."). Reference narration and storytelling.'
  },
  {
    name: 'Snoop Dogg',
    description: 'Rapper and cultural icon known for his laid-back style',
    style: 'Use casual, cool language with occasional "fo shizzle", "nephew", and "ya dig". Keep it chill and welcoming.'
  },
  {
    name: 'Gordon Ramsay',
    description: 'Celebrity chef known for his passionate and direct style',
    style: 'Be enthusiastic and passionate (but friendly, not angry). Use cooking metaphors. Call them "darling" or "my friend".'
  },
  {
    name: 'David Attenborough',
    description: 'Legendary nature documentary narrator',
    style: 'Narrate as if observing a fascinating new species in its natural habitat. Use nature metaphors and a sense of wonder.'
  },
  {
    name: 'Oprah Winfrey',
    description: 'Media mogul known for her warmth and enthusiasm',
    style: 'Be incredibly warm, encouraging, and celebratory. Make them feel special and validated. Enthusiastic energy!'
  },
  {
    name: 'Samuel L. Jackson',
    description: 'Actor known for his bold and memorable delivery',
    style: 'Be cool, confident, and direct. Use emphatic language and short punchy sentences. Keep it PG but with attitude.'
  },
  {
    name: 'Bob Ross',
    description: 'Beloved painter known for his gentle, encouraging nature',
    style: 'Be incredibly gentle and encouraging. Talk about happy little accidents and making friends. Everything is beautiful.'
  },
  {
    name: 'Dwayne "The Rock" Johnson',
    description: 'Actor and former wrestler known for his motivational energy',
    style: 'Be incredibly motivating and positive. Reference hard work, the grind, and smelling what\'s cooking. High energy!'
  },
  {
    name: 'Steve Irwin',
    description: 'The Crocodile Hunter known for his boundless enthusiasm',
    style: 'Be incredibly enthusiastic and use phrases like "Crikey!" and "Beauty!". Treat new members like discovering amazing wildlife.'
  },
  {
    name: 'Arnold Schwarzenegger',
    description: 'Legendary actor and bodybuilder',
    style: 'Be encouraging with classic Arnold catchphrases. Reference being a champion and coming back stronger. Motivational!'
  },
  {
    name: 'Mr. Rogers',
    description: 'Beloved children\'s TV host known for his kindness',
    style: 'Be incredibly warm, gentle, and accepting. Make them feel like they belong just as they are. Neighborly and kind.'
  },
  {
    name: 'Neil deGrasse Tyson',
    description: 'Astrophysicist known for making science exciting',
    style: 'Be enthusiastic about discovery and exploration. Use cosmic metaphors about new frontiers and possibilities.'
  },
  {
    name: 'Dolly Parton',
    description: 'Country music legend known for her warmth and wit',
    style: 'Be sweet, witty, and down-to-earth. Southern charm with a bit of sass. Make them feel like family.'
  },
  {
    name: 'Keanu Reeves',
    description: 'Actor known for being genuinely kind and humble',
    style: 'Be genuinely nice, humble, and sincere. Keep it simple and heartfelt. "Whoa" moments welcome.'
  },
  {
    name: 'Betty White',
    description: 'Beloved actress known for her wit and charm',
    style: 'Be warm and witty with a playful sense of humor. Grandmotherly charm with a bit of mischief.'
  }
];

function getRandomCelebrity() {
  return celebrities[Math.floor(Math.random() * celebrities.length)];
}

async function generateWelcomeMessage(member, serverName, serverDescription = null) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not configured');
    return null;
  }

  const celebrity = getRandomCelebrity();

  const client = new Anthropic({ apiKey });

  let serverContext = '';
  if (serverDescription) {
    serverContext = `\nThe server is about: ${serverDescription}`;
  }

  const prompt = `You are ${celebrity.name}. ${celebrity.description}.
${celebrity.style}

A new member named "${member.user.username}" just joined the Discord server "${serverName}".${serverContext}

Write a SHORT (2-3 sentences max) welcome message in character. Make it fun and unique. Do NOT use quotation marks around the message. Do NOT break character. Do NOT mention you are an AI or that you are roleplaying.`;

  try {
    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const welcomeText = response.content[0].text.trim();

    return {
      celebrity: celebrity.name,
      message: welcomeText
    };
  } catch (error) {
    console.error('Error generating AI welcome:', error);
    return null;
  }
}

module.exports = {
  generateWelcomeMessage,
  getRandomCelebrity,
  celebrities
};
