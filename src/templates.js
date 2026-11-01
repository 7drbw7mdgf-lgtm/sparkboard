import { blobToDataURL } from './storage/media-codec.js';
import { colors, node, uid } from './core.js';
export async function sample(kind = 'brainstorm') {
  if (kind === 'studio') {
    const response = await fetch(new URL('../assets/moodboard-study.png', import.meta.url));
    if (!response.ok) throw new Error('The template image could not be loaded.');
    return studioSample(await blobToDataURL(await response.blob()));
  }
  if (kind === 'blank') return [];
  if (kind === 'retro')
    return [
      node('text', 180, 100, 800, 65, 'A little reflection. A better next sprint.', '#29352a'),
      ...['What went well', 'What could be better', 'What we’ll try next'].flatMap((t, i) => [
        node('frame', 180 + i * 300, 220, 275, 420, t.toUpperCase(), 'transparent'),
        node(
          'sticky',
          215 + i * 300,
          290,
          200,
          170,
          ['Celebrate a small win', 'Find one friction point', 'One experiment for next week'][i],
          colors[i],
        ),
      ]),
    ];
  if (kind === 'mindmap') {
    let c = node('shape', 470, 300, 230, 120, 'Your big idea', colors[1]),
      ns = [
        node('sticky', 180, 130, 190, 155, 'Who is it for?', colors[0]),
        node('sticky', 800, 130, 190, 155, 'Why does it matter?', colors[3]),
        node('sticky', 180, 490, 190, 155, 'What could it become?', colors[2]),
        node('sticky', 800, 490, 190, 155, 'What’s the first step?', colors[4]),
      ];
    c.mindmap = true;
    c.mindParent = null;
    ns.forEach((topic, i) => {
      topic.mindmap = true;
      topic.mindParent = c.id;
      topic.mindOrder = i;
    });
    return [
      c,
      ...ns,
      ...ns.map((n) => ({
        id: uid(),
        type: 'connector',
        from: c.id,
        to: n.id,
      })),
    ];
  }
  return [
    node('text', 180, 95, 800, 60, 'A space for what’s next.', '#29352a'),
    node('text', 184, 153, 800, 40, 'No perfect ideas needed. Just a place to start.', '#919986', {
      fontSize: 14,
      fontWeight: 400,
    }),
    node('frame', 180, 240, 290, 470, '01  /  THE OPPORTUNITY', 'transparent'),
    node('frame', 505, 240, 290, 470, '02  /  THE POSSIBILITIES', 'transparent'),
    node('frame', 830, 240, 290, 470, '03  /  THE NEXT STEP', 'transparent'),
    node(
      'sticky',
      222,
      305,
      205,
      180,
      'What if getting started\nfelt a little easier?',
      colors[0],
      {
        rotation: -2,
      },
    ),
    node('sticky', 240, 514, 195, 150, 'Less friction.\nMore room to create.', colors[2], {
      rotation: 2,
    }),
    node('sticky', 547, 311, 205, 180, 'Make space for the\n“what if” ideas.', colors[1], {
      rotation: 2,
    }),
    node('sticky', 548, 520, 205, 150, 'Simple by design.\nThoughtful by default.', colors[3], {
      rotation: -2,
    }),
    node('sticky', 872, 310, 205, 180, 'Start small.\nMake something real.', colors[4], {
      rotation: -2,
    }),
    node(
      'text',
      868,
      548,
      220,
      85,
      '↗  Your next great idea\n     could start right here.',
      '#7f8974',
      {
        fontSize: 14,
        fontWeight: 500,
      },
    ),
  ];
}
export function studioSample(imageSource) {
  const title = node(
    'text',
    180,
    65,
    940,
    65,
    'A little inspiration. A lot of possibility.',
    '#303e28',
    {
      fontSize: 30,
    },
  );
  const subtitle = node(
    'text',
    184,
    132,
    920,
    40,
    'Collect the pieces. Find the connections. Make something yours.',
    '#8e9c80',
    {
      fontSize: 14,
      fontWeight: 400,
    },
  );
  const frames = [
    node('frame', 180, 220, 320, 510, '01  /  COLLECT', 'transparent'),
    node('frame', 535, 220, 320, 510, '02  /  CONNECT', 'transparent'),
    node('frame', 890, 220, 300, 510, '03  /  CREATE', 'transparent'),
  ];
  const image = node('image', 205, 285, 270, 169, 'Color & form study', '#ffffff', {
    src: imageSource,
  });
  const resource = node('link', 205, 480, 270, 180, 'Freeform inspiration', '#ffffff', {
    url: 'https://support.apple.com/en-ie/guide/freeform/welcome/mac',
  });
  const note = node(
    'sticky',
    568,
    287,
    245,
    155,
    'What if we made more room\nfor the unexpected?',
    colors[0],
    {
      fontSize: 17,
    },
  );
  const diamond = node('diamond', 625, 493, 130, 130, 'A fresh\nperspective', colors[3], {
    fontSize: 14,
  });
  const next = node(
    'sticky',
    922,
    287,
    235,
    155,
    'Start with one small idea.\nSee where it takes you.',
    colors[1],
    {
      fontSize: 17,
    },
  );
  const footer = node(
    'text',
    923,
    522,
    230,
    100,
    '↗  Add an image or PDF\n↗  Save a view as a scene\n↗  Group and arrange ideas',
    '#7e8c70',
    {
      fontSize: 13,
      fontWeight: 400,
    },
  );
  const connection = {
    id: uid(),
    type: 'connector',
    from: note.id,
    to: diamond.id,
    color: '#9ca88e',
    strokeWidth: 2,
  };
  return [title, subtitle, ...frames, image, resource, note, diamond, next, footer, connection];
}
