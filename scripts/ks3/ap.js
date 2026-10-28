'use strict';
// KS3 AP-style exam practice (Years 7–9).
// Every KS3 topic gets the three question types used in the department's AP exams and revision guidance:
//   ks3d  Describe two features of …
//   ks3s  What can you learn from Source A about …?
//   ks3j  '[Statement].' How far do you agree?
// The AP paper also has a short knowledge-recall section and a chronology timeline task; those are practised
// through the Quizzes (short answer, chronology) and the Key dates quiz, so they are described in the exam guide only.
//
// apply(topic) is called by lib.js when topics are generated, and by apply-ap.js for hand-made topics
// (y7-hastings). It keeps an existing describe question and an existing "How far do you agree?" question
// (with their models and topic-specific frames) and adds the missing ones from the bank below.
// Source questions describe a real source in our own words; they never invent quotations.

const SOURCE_NOTE = 'Source A is described in our own words for revision practice. In the exam you will be given the source itself.';
const LABEL = 'Teacher-created practice question';

// topic id -> { d: describe question, s: source question, j: how far question }  (only the ones that are missing)
const BANK = {
  // ---------------- Year 7: What is History?
  'y7-sk-1': {
    d: { q: 'Describe two features of a primary source.', sections: ['s2', 's3'] },
    s: { q: 'What can you learn from Source A about life in Dubai before the discovery of oil?', sections: ['s3'],
      sources: [{ label: 'Source A', provenance: 'A black-and-white photograph taken by the British explorer Wilfred Thesiger on the Trucial Coast in the late 1940s. It is now held by the Pitt Rivers Museum, Oxford.', text: 'The photograph shows wooden dhows moored along Dubai Creek. Men are carrying sacks and bundles of goods from the boats onto the shore. Behind them are low buildings made of coral stone and palm fronds, with a wind tower. There are no cars, cranes or tall buildings.' }] }
  },
  'y7-sk-2': {
    d: { q: 'Describe two features of the BCE/CE dating system.', sections: ['s2'] },
    s: { q: 'What can you learn from Source A about how historians measure time?', sections: ['s1', 's2'],
      sources: [{ label: 'Source A', provenance: 'A teacher-created timeline made for this revision task (it is not a historical source), using dates from your Year 7 lessons.', text: 'The timeline runs from left to right. It starts at c. 3000 BCE (Bronze Age settlement at Hili) and passes 622 CE (the Hijra, start of the Hijri calendar), 1066 (Battle of Hastings, 11th century), 1324 (Mansa Musa\'s pilgrimage, 14th century) and ends at 1971 (formation of the UAE, 20th century). The gap between 3000 BCE and 622 CE is drawn the same size as the gap between 1324 and 1971.' }] }
  },
  'y7-sk-3': {
    d: { q: 'Describe two features of a good historical enquiry question.', sections: ['s1'] },
    s: { q: 'What can you learn from Source A about the causes of the crisis of 1066?', sections: ['s2'],
      sources: [{ label: 'Source A', provenance: 'A scene from the Bayeux Tapestry, an embroidery probably made in the 1070s for Bishop Odo of Bayeux, William of Normandy\'s half-brother.', text: 'The scene shows the death of King Edward the Confessor in January 1066. Edward lies in bed surrounded by his household, with one man (often identified as Harold Godwinson) reaching towards him. In the next scene, men offer Harold the crown, and he is shown sitting on the throne as king.' }] }
  },
  'y7-sk-4': {
    d: { q: 'Describe two features of Mansa Musa\'s pilgrimage to Mecca in 1324.', sections: ['s1'] },
    s: { q: 'What can you learn from Source A about how Europeans saw the Mali Empire?', sections: ['s1'],
      sources: [{ label: 'Source A', provenance: 'A section of the Catalan Atlas, an illustrated world map made in Majorca in 1375, attributed to the workshop of Abraham Cresques. It is held by the Bibliothèque nationale de France.', text: 'The map shows a crowned African ruler, Mansa Musa, seated on a throne in West Africa. He wears a golden crown, holds a golden sceptre and raises a large gold nugget. A rider on a camel approaches him. A label next to him describes him as the richest and most noble lord of the region because of the gold found in his land.' }] }
  },
  'y7-sk-5': {
    d: { q: 'Describe two features of the formation of the UAE in 1971.', sections: ['s2'] },
    s: { q: 'What can you learn from Source A about change in Dubai?', sections: ['s2'],
      sources: [{ label: 'Source A', provenance: 'Two photographs of Dubai Creek: the first taken in the late 1940s by the explorer Wilfred Thesiger, the second a modern photograph taken from the same area in the 2020s.', text: 'In the first photograph, wooden dhows unload goods beside low coral-stone buildings and a wind tower. In the second, wooden dhows are still moored on the Creek and still carry cargo, but behind them are glass skyscrapers, roads full of cars and the Burj Khalifa in the distance.' }] },
    j: { type: 'judge', minutes: 20, q: '"The discovery of oil in 1966 was the most significant event in the history of Dubai." How far do you agree?', sections: ['s1', 's2'] }
  },
  'y7-hastings': {
    s: { q: 'What can you learn from Source A about how the Normans won the Battle of Hastings?', sections: ['s4', 's5', 's6'],
      sources: [{ label: 'Source A', provenance: 'A scene from the Bayeux Tapestry, an embroidery probably made in the 1070s for Bishop Odo of Bayeux, William\'s half-brother. It tells the Norman story of 1066.', text: 'In the middle of the battle, Norman knights on horseback charge an English shield wall on a hill. Some Normans are falling. Duke William pushes back his helmet to show his face to his men, because a rumour had spread that he had been killed. Bishop Odo, holding a club, rallies young soldiers. Later scenes show English soldiers being cut down as they leave the hill.' }] }
  },
  // ---------------- Year 8: Explorers, Encounters and Empire; African Tudors
  'y8-ex-1': {
    s: { q: 'What can you learn from Source A about travel and trade in the 14th century?', sections: ['s1', 's2'],
      sources: [{ label: 'Source A', provenance: 'From the Rihla (travel account) of Ibn Battuta, a scholar from Morocco. He dictated it from memory in the 1350s to the writer Ibn Juzayy, for the ruler of Morocco.', text: 'In this part of the Rihla, Ibn Battuta describes arriving at the East African port of Kilwa. He praises it as one of the most beautiful and well-built towns he has seen, describes its Muslim ruler giving gifts to scholars and travellers, and mentions merchants trading in gold that came from the African interior.' }] }
  },
  'y8-ex-2': {
    d: { q: 'Describe two features of the spice trade before 1500.', sections: ['s1'] },
    s: { q: 'What can you learn from Source A about where European navigators got their knowledge?', sections: ['s3'],
      sources: [{ label: 'Source A', provenance: 'An astrolabe made in the Islamic world in the medieval period. Examples are held by the British Museum and the History of Science Museum, Oxford.', text: 'A round brass instrument about the size of a large plate. It has a movable pointer and a pierced metal plate marked with the positions of stars, and the names of stars are engraved in Arabic. Lines on the back allow the user to measure the height of the sun or a star above the horizon.' }] }
  },
  'y8-ex-3': {
    d: { q: 'Describe two features of the Columbian Exchange.', sections: ['s2'] },
    s: { q: 'What can you learn from Source A about Columbus\'s aims in the Caribbean?', sections: ['s1'],
      sources: [{ label: 'Source A', provenance: 'From Columbus\'s journal of his first voyage, 1492, written for the Spanish monarchs who paid for the voyage. It survives mainly in a later summary by the friar Bartolomé de las Casas.', text: 'In entries from October 1492, Columbus describes meeting the Taíno people. He writes that they are gentle, unarmed and generous, and that they would easily become Christians and good servants. He repeatedly asks them where gold can be found and notes the small gold ornaments some of them wear.' }] },
    j: { type: 'judge', minutes: 20, q: '"Christopher Columbus should be remembered as an invader rather than an explorer." How far do you agree?', sections: ['s1', 's2'] }
  },
  'y8-ex-4': {
    d: { q: 'Describe two features of the Mexica (Aztec) Empire before 1519.', sections: ['s1'] },
    s: { q: 'What can you learn from Source A about the fall of Tenochtitlan?', sections: ['s1'],
      sources: [{ label: 'Source A', provenance: 'From the Florentine Codex, compiled in the 1570s by Nahua (Indigenous Mexican) authors and artists working with the Spanish friar Bernardino de Sahagún.', text: 'One illustration shows Mexica people lying sick with smallpox, their bodies covered in sores, while others care for them. Other pages show Spanish soldiers fighting alongside thousands of Indigenous allies, and canoes and boats on the lake around Tenochtitlan during the siege.' }] }
  },
  'y8-ex-5': {
    d: { q: 'Describe two features of the transatlantic slave trade.', sections: ['s1'] },
    s: { q: 'What can you learn from Source A about who gained and who lost from European expansion?', sections: ['s1', 's2'],
      sources: [{ label: 'Source A', provenance: 'Data from the Trans-Atlantic Slave Trade Database (SlaveVoyages), built by an international team of historians from shipping records since the 1990s.', text: 'The database records tens of thousands of slave-trading voyages. Its estimates show that over 12 million Africans were forced onto ships across the Atlantic between the 1500s and 1800s, and that well over a million died during the crossing. It also lists the ships, their owners and the European and American ports they sailed from.' }] }
  },
  'y8-af-1': {
    s: { q: 'What can you learn from Source A about Africans in Tudor England?', sections: ['s1', 's3'],
      sources: [{ label: 'Source A', provenance: 'From Miranda Kaufmann\'s book "Black Tudors: The Untold Story" (2017). Kaufmann is a historian who researched parish registers, court cases and royal accounts.', text: 'Kaufmann explains that she found records of over 360 Africans living in Britain between 1500 and 1640. They appear in baptism and burial registers, wage lists and court records, and worked as musicians, sailors, divers, servants and craftspeople in towns such as London, Bristol and Plymouth.' }] }
  },
  'y8-af-2': {
    d: { q: 'Describe two features of John Blanke\'s life at the Tudor court.', sections: ['s1'] },
    s: { q: 'What can you learn from Source A about John Blanke\'s position at the court of Henry VIII?', sections: ['s1'],
      sources: [{ label: 'Source A', provenance: 'The Westminster Tournament Roll, an illustrated roll made in 1511 to record the tournament celebrating the birth of Henry VIII\'s son. It is held by the College of Arms.', text: 'The roll shows a procession of royal trumpeters on horseback, each wearing the same royal livery and blowing a trumpet hung with a banner. One of them is a Black man wearing a turban, generally identified as John Blanke. He appears twice on the roll, riding in his place among the other trumpeters.' }] },
    j: { type: 'judge', minutes: 20, q: '"John Blanke\'s story tells us more about Africans in Tudor England than any other Black Tudor life." How far do you agree?', sections: ['s1', 's2', 's3', 's4'] }
  },
  'y8-af-3': {
    d: { q: 'Describe two features of the everyday lives of Africans in Tudor England.', sections: ['s2'] },
    s: { q: 'What can you learn from Source A about the status of Africans in Tudor England?', sections: ['s1'],
      sources: [{ label: 'Source A', provenance: 'Court records of the High Court of Admiralty, 1548, in which the African diver Jacques Francis gave evidence in a case about goods salvaged from a wrecked Venetian ship near Southampton. Francis had also worked on salvaging the Mary Rose.', text: 'The records show that Jacques Francis, described as a diver born in Africa, was allowed to give sworn evidence in an English court. The opposing side tried to have his evidence rejected by calling him a slave and an infidel, but the court still recorded his testimony.' }] }
  },
  // ---------------- Year 9: Industrial Revolution; causes of the First World War
  'y9-ir-1': {
    d: { q: 'Describe two features of Britain in 1750.', sections: ['s1'] },
    s: { q: 'What can you learn from Source A about why industry grew in Britain?', sections: ['s2'],
      sources: [{ label: 'Source A', provenance: 'A description of the Bridgewater Canal, built by the Duke of Bridgewater and the engineer James Brindley and opened in 1761.', text: 'The canal carried coal from the Duke\'s mines at Worsley to Manchester. In places it crossed a river on an aqueduct. Once it opened, the price of coal in Manchester fell sharply, because barges could carry far more coal, more cheaply, than carts on poor roads.' }] }
  },
  'y9-ir-2': {
    d: { q: 'Describe two features of the Agricultural Revolution.', sections: ['s2'] },
    s: { q: 'What can you learn from Source A about the link between slavery and British industry?', sections: ['s1'],
      sources: [{ label: 'Source A', provenance: 'From "Capitalism and Slavery" (1944) by the Trinidadian historian Eric Williams, based on his doctoral research at Oxford.', text: 'Williams argues that the profits of the slave trade and of plantations in the Caribbean helped provide money for British banks, shipping and industry, and that ports such as Liverpool and Bristol grew rich on Atlantic trade. He also argues that Britain abolished the slave trade partly because it had become less profitable.' }] },
    j: { type: 'judge', minutes: 20, q: '"Empire was the main reason the Industrial Revolution happened in Britain." How far do you agree?', sections: ['s1', 's2'] }
  },
  'y9-ir-3': {
    d: { q: 'Describe two features of the factory system.', sections: ['s1'] },
    s: { q: 'What can you learn from Source A about how factories changed work?', sections: ['s1'],
      sources: [{ label: 'Source A', provenance: 'Cromford Mill, Derbyshire, opened by Richard Arkwright in 1771. It is now part of the Derwent Valley Mills World Heritage Site.', text: 'A tall stone mill of several storeys beside a fast-flowing stream, with a water wheel to drive the machines. The windows are large to let in light for long shifts. Arkwright also built rows of cottages, a chapel and a market nearby for the workers and their families, many of them children.' }] }
  },
  'y9-ir-4': {
    d: { q: 'Describe two features of working conditions for children in textile mills.', sections: ['s1'] },
    s: { q: 'What can you learn from Source A about children\'s working lives in the early 1830s?', sections: ['s1'],
      sources: [{ label: 'Source A', provenance: 'From the report of the Sadler Committee, 1832, a parliamentary committee led by Michael Sadler, who wanted laws to limit children\'s working hours.', text: 'Former child workers told the committee that they began work in the mills at six or seven years old, worked shifts of fourteen hours or more, were beaten by overlookers if they fell asleep, and were fined for being late. Some described injuries from machinery and deformed legs from standing all day.' }] }
  },
  'y9-ir-5': {
    d: { q: 'Describe two features of the railway age in Britain.', sections: ['s1'] },
    s: { q: 'What can you learn from Source A about how far life in Britain had changed by 1900?', sections: ['s1'],
      sources: [{ label: 'Source A', provenance: 'Population figures from the official census of England and Wales, published by the government.', text: 'In 1801 the census counted about 9 million people in England and Wales, and most lived in the countryside. By 1901 it counted about 32.5 million, and more than three-quarters lived in towns and cities. Manchester had grown from a small town in the 1750s to a city of over 300,000 people by 1850.' }] }
  },
  'y9-ww-1': {
    s: { q: 'What can you learn from Source A about the naval race between Britain and Germany?', sections: ['s1'],
      sources: [{ label: 'Source A', provenance: 'A description of HMS Dreadnought, the British battleship launched in February 1906.', text: 'Dreadnought was faster than any battleship before her and carried ten large 12-inch guns. Her design made every older battleship out of date overnight. Germany soon began building its own dreadnoughts, and in 1909 British newspapers and politicians campaigned under the slogan "We want eight, and we won\'t wait" for more to be built.' }] }
  },
  'y9-ww-2': {
    d: { q: 'Describe two features of the assassination of Archduke Franz Ferdinand.', sections: ['s1'] },
    s: { q: 'What can you learn from Source A about why the July Crisis led to war?', sections: ['s2'],
      sources: [{ label: 'Source A', provenance: 'A description of the ultimatum sent by the government of Austria-Hungary to Serbia on 23 July 1914.', text: 'The ultimatum blamed Serbia for the assassination of Franz Ferdinand. It demanded that Serbia ban anti-Austrian groups and propaganda, sack officials named by Austria-Hungary, and allow Austro-Hungarian officials to take part in the investigation inside Serbia. Serbia was given only 48 hours to accept every demand.' }] }
  }
};

const TYPE = { ks3d: 'describe', ks3s: 'source', ks3j: 'judge' };
const MIN = { ks3d: 8, ks3s: 10, ks3j: 20 };

function isHowFar(q) { return /how far do you agree/i.test(q.q || ''); }

function apply(t) {
  if (!/^y[789]-/.test(t.id)) return t;
  const bank = BANK[t.id] || {};
  const qs = t.exam.questions.filter((q) => !String(q.id).startsWith('ap-'));
  const keepD = qs.find((q) => q.type === 'describe' && /^describe two/i.test(q.q));
  const keepJ = qs.find((q) => q.type === 'judge' && isHowFar(q));
  const out = [];
  const mk = (id, qtype, b) => ({ id, qtype, type: TYPE[qtype], label: LABEL, minutes: MIN[qtype], markscheme: null, ...b,
    ...(b.sources ? { sources_note: SOURCE_NOTE } : {}) });
  if (keepD) out.push({ ...keepD, qtype: 'ks3d' }); else if (bank.d) out.push(mk('ap-d', 'ks3d', bank.d));
  if (bank.s) out.push(mk('ap-s', 'ks3s', bank.s));
  if (keepJ) out.push({ ...keepJ, qtype: 'ks3j' }); else if (bank.j) out.push(mk('ap-j', 'ks3j', bank.j));
  if (out.length !== 3) throw new Error(`${t.id}: expected 3 AP questions, got ${out.length}`);
  for (const q of out) { const m = /\((\d+) marks\)\s*$/.exec(q.q); if (m) { q.q = q.q.replace(/\s*\(\d+ marks\)\s*$/, ''); } }
  t.exam.questions = out;
  return t;
}

module.exports = { apply, BANK };
