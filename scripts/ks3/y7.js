'use strict';
// Year 7, Autumn 1: What is History? How do historians find out what really happened in the past?
// Built from Mr Garry's 14-lesson unit (lessons 1–11 are content; 12–14 are AP1 prep, assessment and DIRT).
const { T, peej } = require('./lib');
const base = { course: 'y7', area: 'skills' };

const writeQ = (o) => ({ type: 'explain', minutes: 12, ...o });

T({ ...base, id: 'y7-sk-1', order: 1, kt: 'Lessons 1–2', title: 'Thinking like a historian: sources and evidence',
  intro: 'The past is everything that has already happened. History is what historians build when they investigate it. This topic shows you how: by asking questions of sources, making careful inferences, and checking who made a source, when and why.',
  sections: [
    ['s1', '1. The past and History are not the same thing', [
      'The past happened once and is gone. We cannot visit it. History is the account people construct afterwards by investigating what survives: objects, documents, pictures, buildings and memories.',
      'That is why two historians can know the same facts and still disagree. They may ask different questions, give different evidence more weight, or explain it differently. An account of the past made later is called an interpretation.',
      'Thinking like a historian means asking: What happened? How do we know? How sure can we be? Over this unit you build a Historian\'s Toolkit of ideas: evidence, chronology, enquiry, cause and consequence, perspective, ethics, significance, change and continuity, and argument.'
    ], ['past', 'History', 'historian', 'interpretation', "Historian's Toolkit"], ['The past = what happened. History = how we investigate and explain it.', 'An interpretation is a later account or explanation of the past.']],
    ['s2', '2. Sources and evidence', [
      'A source is anything that gives us information about the past. Historians often sort sources into four kinds:',
      ['Written: letters, diaries, newspapers, laws, official records.', 'Visual: photographs, paintings, maps, cartoons.', 'Oral: memories passed on by speaking, such as an interview with a grandparent or traditions passed down through a community.', 'Physical: objects and buildings, like pottery, coins, tools or a fort.'],
      'A source only becomes evidence when a historian uses it to answer a question. The same photograph of Dubai Creek could be evidence about boats, about trade, or about what people wore, depending on the question.',
      'There is no single "best" type of source. It depends on what the historian wants to find out. Oral history matters especially where few written records survive.'
    ], ['source', 'evidence', 'written', 'visual', 'oral', 'physical'], ['A source becomes evidence when it is used to answer a question.', 'The best type of source depends on the question being asked.']],
    ['s3', '3. Inference and provenance', [
      'An inference is a conclusion you reach from evidence, rather than something the source states directly. Historians move step by step: SOURCE → QUESTION → EVIDENCE → INFERENCE. A useful sentence pattern is: "I can see… This suggests… Therefore I can infer…"',
      'Provenance means who made a source, when, where and why. It shapes what a source can tell us. A foreign visitor describing Dubai in the mid-20th century might notice things locals took for granted but miss things only locals understood. An Emirati recalling childhood decades later remembers from the inside, but memory can change over time. An official record may be precise but only cover what officials cared about.',
      'A biased source is not useless. It may be excellent evidence of what its maker believed or wanted others to believe. The question is always: reliable for what? Historians check one source against others. This is called corroboration.'
    ], ['inference', 'provenance', 'bias', 'reliability', 'corroboration'], ['I can see → this suggests → therefore I can infer.', 'Provenance = who, when, where, why.', 'Ask "reliable for what?", not just "reliable or unreliable?"']]
  ],
  timeline: [
    ['c. 3000 BCE', 'Bronze Age communities live at Hili, near Al Ain. Archaeologists study their tombs and settlement remains.'],
    ['c. 1787', 'Al Fahidi Fort is built in Dubai. It is often described as the oldest surviving building in the city.'],
    ['1833', 'Members of the Bani Yas, led by the Al Maktoum family, settle at Dubai.'],
    ['Late 1940s', 'The explorer Wilfred Thesiger photographs life in the region, including Dubai. His photographs are now held in museum collections.'],
    ['1966', 'Oil is discovered offshore in Dubai.'],
    ['1971', 'The United Arab Emirates is formed on 2 December.'],
    ['2002', 'The Iron Age site of Saruq Al Hadid is discovered in the desert near Dubai.']
  ],
  people: [['Wilfred Thesiger', 'British explorer who travelled in Arabia in the 1940s. His photographs are an outsider\'s visual record of the region.'], ['You, the historian', 'Every source needs someone to ask it a good question.']],
  vocab: [['Past', 'Everything that has already happened.'], ['History', 'How we investigate and construct accounts of the past.'], ['Historian', 'Someone who investigates the past.'], ['Interpretation', 'A later explanation or account of the past.'], ['Source', 'Something that gives us information about the past.'], ['Evidence', 'Information from a source used to answer a question.'], ['Inference', 'A conclusion based on evidence, not just what is stated.'], ['Provenance', 'Who created a source, when, where and why.'], ['Corroboration', 'Checking a source against other sources to see if they agree.'], ['Bias', 'A one-sided view that favours one side or idea.']],
  myths: [
    ['History is just remembering facts.', 'History is investigating the past and building an argument from evidence. Facts matter, but historians also ask how we know and how sure we can be.'],
    ['A biased source is useless.', 'A biased source can be very useful, for example as evidence of what someone believed. Always ask "useful for what?"'],
    ['An inference is just repeating what the source says.', 'An inference goes beyond the words or picture: it is what the evidence suggests.'],
    ['Older sources are always more reliable.', 'Age does not make a source reliable. Provenance and the question you are asking matter more.']
  ],
  sources: [
    { id: 'thesiger', title: "Wilfred Thesiger's photographs of the Trucial Coast", type: 'Black-and-white photographs', date: 'Late 1940s', origin: 'Taken by a British explorer; now held in museum collections (Pitt Rivers Museum, Oxford).', purpose: 'A personal record of his travels in Arabia.', usefulness: 'Shows everyday life before oil wealth. It is an outsider\'s view, so we must ask what he chose to photograph and what he left out.' },
    { id: 'fahidi', title: 'Al Fahidi Fort', type: 'Building (physical source)', date: 'Built around 1787', origin: 'Built in Dubai; today it houses part of the Dubai Museum.', purpose: 'Defence of the settlement, and later a ruler\'s residence and garrison.', usefulness: 'Physical evidence of how early Dubai was defended and built. It does not tell us what ordinary people thought.' },
    { id: 'oral', title: 'Oral history interview with an Emirati elder', type: 'Oral source (recorded memory)', date: 'Recorded recently about childhood decades ago', origin: 'A person remembering their own experience.', purpose: 'To preserve memories of life before rapid development.', usefulness: 'Gives an insider\'s experience that official records miss. Memory can change over time, so historians corroborate it.' }
  ],
  mcq: [
    ['s1', 'What is the difference between "the past" and "History"?', ['They mean exactly the same thing', 'The past is what happened; History is how we investigate and explain it', 'History is only about kings and wars', 'The past is only about the last 100 years'], 1, 'History is constructed by investigating the past.'],
    ['s1', 'What is an interpretation?', ['A source made at the time', 'A later explanation or account of the past', 'A date on a timeline', 'An object found by archaeologists'], 1, 'Interpretations are made after the event.'],
    ['s2', 'Which of these is an ORAL source?', ['A coin', 'A newspaper', 'A recorded interview with a grandparent', 'A map'], 2, 'Oral sources are memories passed on by speaking.'],
    ['s2', 'Al Fahidi Fort is which type of source?', ['Written', 'Physical', 'Oral', 'Visual'], 1, 'Buildings and objects are physical sources.'],
    ['s2', 'When does a source become evidence?', ['When it is very old', 'When it is in a museum', 'When a historian uses it to answer a question', 'When it is written down'], 2, 'Evidence is a source used to answer a question.'],
    ['s3', 'What does provenance mean?', ['How old a source is', 'Who made a source, when, where and why', 'Whether a source is true', 'How long a source is'], 1, 'Provenance = who, when, where, why.'],
    ['s3', 'What is corroboration?', ['Throwing away biased sources', 'Checking a source against other sources', 'Copying a source into your book', 'Guessing what a source means'], 1, 'Historians corroborate by checking sources against each other.'],
    ['s3', 'Which statement about bias is most accurate?', ['Biased sources should always be ignored', 'A biased source can still be useful, depending on the question', 'Only modern sources are biased', 'Photographs cannot be biased'], 1, 'Ask "reliable for what?"']
  ],
  short: [
    ['s2', 'Name the four types of historical source.', ['written visual oral physical', 'written, visual, oral, physical', 'written oral visual physical'], 'Written, visual, oral, physical'],
    ['s3', 'What word means a conclusion based on evidence, not just what is stated?', ['inference', 'an inference', 'infer'], 'Inference'],
    ['s3', 'What word means who made a source, when and why?', ['provenance'], 'Provenance'],
    ['s1', 'What do we call someone who investigates the past?', ['historian', 'a historian'], 'Historian'],
    ['s3', 'Checking one source against others is called…?', ['corroboration', 'corroborating', 'corroborate'], 'Corroboration']
  ],
  chron: [['Put these in order (earliest first)', ['Bronze Age settlement at Hili', 'Al Fahidi Fort built', 'Al Maktoum family settle at Dubai', 'Thesiger photographs the region', 'Oil discovered offshore in Dubai', 'The UAE is formed']]],
  match: [['Match each source to its type', [['A recorded interview with an elder', 'Oral'], ['A 1940s photograph of Dubai Creek', 'Visual'], ['Al Fahidi Fort', 'Physical'], ['A government record', 'Written']]]],
  evid: [
    ['s3', 'Explain how the provenance of a foreign visitor\'s description of mid-20th-century Dubai affects what it can tell a historian.', [['visitor', 'outsider', 'foreign'], ['notice', 'miss', 'overlook', 'took for granted', 'understand']], 'As an outsider, the visitor may notice things locals took for granted, such as daily routines, but may misunderstand or miss things only locals knew. So it is useful for how Dubai looked to outsiders, but historians should corroborate it.'],
    ['s3', 'Use the "I can see… This suggests… Therefore…" steps to make an inference from a photograph of wooden boats (dhows) crowded on Dubai Creek.', [['see', 'boats', 'dhows'], ['suggests', 'trade', 'fishing', 'busy'], ['therefore', 'infer']], 'I can see many wooden dhows tied up close together on the creek. This suggests the creek was busy with trade or fishing. Therefore I can infer the sea was central to how people earned a living.']
  ],
  flash: [
    ['s1', 'Past or History: which one is constructed?', 'History. Historians construct it by investigating the past.'], ['s1', 'Interpretation', 'A later explanation or account of the past.'],
    ['s2', 'Four types of source', 'Written, visual, oral, physical.'], ['s2', 'When does a source become evidence?', 'When it is used to answer a question.'],
    ['s2', 'Example of a physical source in Dubai', 'Al Fahidi Fort (built around 1787).'], ['s3', 'Inference', 'A conclusion based on evidence, not just what is stated.'],
    ['s3', 'Inference sentence steps', 'I can see… This suggests… Therefore I can infer…'], ['s3', 'Provenance', 'Who made a source, when, where and why.'],
    ['s3', 'Corroboration', 'Checking a source against other sources.'], ['s3', 'Is a biased source useless?', 'No. It can be very useful. Ask "reliable for what?"'],
    ['s1', 'When was the UAE formed?', '2 December 1971.'], ['s2', 'Why does oral history matter?', 'It preserves experiences that were never written down.']
  ],
  check: [
    ['describe', 'I can describe the difference between the past and History.', ['s1']], ['describe', 'I can describe the four types of historical source with an example of each.', ['s2']],
    ['explain', 'I can explain when a source becomes evidence.', ['s2']], ['explain', 'I can explain how provenance affects what a source can tell us.', ['s3']],
    ['explain', 'I can make an inference using "I can see… This suggests… Therefore…".', ['s3']], ['judge', 'I can judge how useful a source is for a particular question, including a biased one.', ['s3']]
  ],
  exam: [
    writeQ({ type: 'explain', minutes: 8, q: 'Study a photograph of Dubai Creek from the late 1940s, showing wooden dhows and people unloading goods. What can you infer about life in Dubai at that time? Give two inferences, each supported with evidence from the source.', sections: ['s3'],
      asks: 'Make two inferences: things the photograph suggests but does not state. Back each one with a detail you can see.',
      steps: ['Look closely and list three things you can SEE.', 'For each, ask: what does this SUGGEST about life then?', 'Write two inferences using "I can see… This suggests… Therefore…".'],
      plan: '2 minutes looking and noting details, 5 minutes writing, 1 minute checking each inference has evidence.',
      success: ['Two separate inferences', 'Each backed by a precise detail from the source', 'Goes beyond describing what is shown'],
      mistakes: ['Only describing the picture ("there are boats")', 'Inferences with no evidence', 'Writing about modern Dubai instead'],
      frame: { full: ['I can see…', 'This suggests…', 'Therefore I can infer…', 'I can also see…', 'This suggests…', 'Therefore I can infer…'], some: ['Inference 1: see → suggests → infer', 'Inference 2: see → suggests → infer'] } }),
    writeQ({ type: 'judge', q: '"A biased source is useless to historians." How far do you agree?', sections: ['s3'],
      asks: 'Decide how far you agree, using examples of sources and the idea of "reliable for what?". You must reach a judgement.',
      steps: ['Decide your view and how strongly (qualifier).', 'Give one example where bias limits a source.', 'Give one example where a biased source is still very useful.', 'Finish with a judgement.'],
      plan: '2 minutes planning a point for each side, 9 minutes writing, 1 minute checking qualifiers and connectives.',
      success: ['A qualified claim (e.g. "I largely disagree")', 'Precise examples of sources', 'Explains using "because / this meant that / therefore"', 'Reaches a clear judgement'],
      mistakes: ['Saying all biased sources are useless', 'No examples', 'No final judgement'],
      model: [{ t: 'I largely disagree that a biased source is useless, because its bias can itself be evidence.', n: 'P: qualified claim.' }, { t: 'For example, an official record written to celebrate a ruler might exaggerate his successes.', n: 'E: precise example.' }, { t: 'This means it is weak evidence of what really happened, but strong evidence of how the ruler wanted to be seen.', n: 'E: explains with "this means".' }, { t: 'Therefore a biased source is useful; historians just need to ask "reliable for what?" and corroborate it.', n: 'J: judgement.' }],
      frame: peej('P: I agree / disagree to a large / some extent that…', 'E: For example, a source such as… shows…', 'E: This means that… because…', 'J: Therefore, overall…') })
  ],
  stretch: [['Deep thinking', 'Can two historians know exactly the same facts and still disagree? Explain using an example.'], ['Bias', 'Could bias actually make a source more useful for some questions? Give a precise example.'], ['Provenance prediction', 'Before reading a source, predict from its provenance alone what it will notice and what it will miss. Then check your prediction.'], ['Silence in the sources', 'Whose voices are hardest to find in sources about the past? Why might that be, and what can historians do about it?']],
  planning: { title: 'Planning grid: how useful is this source?', rows: ['Source A', 'Source B', 'Source C'], cols: ['Type', 'Provenance (who, when, why)', 'Useful for…', 'Limited because…'], judgement: 'The most useful source for my question is … because …' }
});

T({ ...base, id: 'y7-sk-2', order: 2, kt: 'Lessons 3–4', title: 'Chronology and historical time',
  intro: 'Historians need to know when things happened, and in what order, before they can explain anything. This topic covers chronology, BC/BCE and AD/CE dates, centuries and how to spot patterns on a timeline.',
  sections: [
    ['s1', '1. Why chronology matters', [
      'Chronology means arranging events in the order they happened. It lets historians see which events came first, which overlapped and which could have caused others. If the order is wrong, the explanation falls apart: a cause must happen before its effect.',
      'A period is a length of time with shared features, such as the Bronze Age. Time connectives (firstly, then, next, after, finally) help you explain a sequence clearly.',
      'A global timeline shows that different societies developed at the same time. For example, Mansa Musa of Mali made his famous pilgrimage to Mecca in 1324, while England was ruled by Edward II and Edward III.'
    ], ['chronology', 'chronological', 'sequence', 'period', 'time connectives'], ['A cause must happen before its effect.', 'Mansa Musa\'s pilgrimage: 1324.']],
    ['s2', '2. BC/BCE, AD/CE and centuries', [
      'Many historians use a calendar counted from year 1. Dates before it are BC ("before Christ") or BCE ("before common era"). Dates after it are AD ("anno Domini") or CE ("common era"). There is no year 0.',
      'BC/BCE dates count backwards, so 500 BCE is earlier than 100 BCE. AD/CE dates count forwards, so CE 100 is earlier than CE 500.',
      'A century is 100 years and a millennium is 1,000 years. The century number is one more than the "hundreds": 1066 is in the 11th century, 1324 in the 14th century and 1971 in the 20th century.',
      'Other calendars exist too. The Islamic (Hijri) calendar counts from the Hijra in 622 CE. Calendars are human inventions, so they are part of history too.'
    ], ['BC / BCE', 'AD / CE', 'century', 'millennium', 'Hijri calendar'], ['1066 = 11th century; 1324 = 14th century; 1971 = 20th century.', 'There is no year 0.', 'The Hijri calendar begins with the Hijra in 622 CE.']]
  ],
  timeline: [
    ['c. 3000 BCE', 'Bronze Age settlement at Hili (near modern Al Ain).'], ['c. 570 CE', 'Birth of the Prophet Muhammad in Mecca.'], ['622 CE', 'The Hijra: the start of the Islamic (Hijri) calendar.'],
    ['1066', 'William of Normandy wins the Battle of Hastings.'], ['1324', 'Mansa Musa of Mali makes his pilgrimage to Mecca.'],
    ['1914–1918', 'The First World War.'], ['1939–1945', 'The Second World War.'], ['1971', 'The United Arab Emirates is formed.']
  ],
  people: [['Mansa Musa', 'Ruler of the Mali Empire in West Africa (c. 1312–c. 1337), famous for his wealth and his 1324 pilgrimage.']],
  vocab: [['Chronology', 'The arrangement of events in the order they happened.'], ['Chronological', 'In order of time.'], ['Sequence', 'The order in which things occur.'], ['Period', 'A length of time with shared features.'], ['BC / BCE', '"Before Christ" / "before common era": counting back from year 1.'], ['AD / CE', '"Anno Domini" / "common era": counting forward from year 1.'], ['Century', 'A period of 100 years.'], ['Millennium', 'A period of 1,000 years.']],
  myths: [
    ['1066 is in the 10th century.', '1066 is in the 11th century. Add one to the hundreds.'],
    ['500 BCE comes after 100 BCE.', 'BCE dates count backwards, so 500 BCE is earlier.'],
    ['There was a year 0.', 'The count goes from 1 BCE straight to 1 CE.'],
    ['Chronology is just learning dates.', 'Chronology lets you see order, overlap and possible causes. Explanations depend on it.']
  ],
  sources: [],
  mcq: [
    ['s1', 'What does chronology mean?', ['The study of maps', 'Arranging events in the order they happened', 'Writing about famous people', 'Judging if a source is reliable'], 1, 'Chronology is about order in time.'],
    ['s1', 'Why must a cause come before its effect on a timeline?', ['It looks neater', 'Because something cannot be caused by an event that happened later', 'Teachers prefer it', 'It does not matter'], 1, 'Explanations depend on correct chronology.'],
    ['s2', 'Which century is 1066 in?', ['10th', '11th', '12th', '16th'], 1, 'Add one to the hundreds: 10 + 1 = 11.'],
    ['s2', 'Which century is 1971 in?', ['19th', '20th', '21st', '17th'], 1, '19 + 1 = 20th century.'],
    ['s2', 'Which date is earliest?', ['100 BCE', '500 BCE', 'CE 100', 'CE 500'], 1, 'BCE dates count backwards.'],
    ['s2', 'How long is a millennium?', ['10 years', '100 years', '1,000 years', '10,000 years'], 2, 'Millennium = 1,000 years.'],
    ['s2', 'Which event starts the Islamic (Hijri) calendar?', ['The birth of the Prophet', 'The Hijra in 622 CE', 'The building of the Kaaba', 'The formation of the UAE'], 1, 'The Hijri calendar counts from the Hijra.'],
    ['s1', 'Mansa Musa\'s pilgrimage to Mecca took place in…', ['1066', '1324', '1492', '1971'], 1, '1324, in the 14th century.']
  ],
  short: [
    ['s2', 'Which century is 1324 in?', ['14th', '14th century', 'fourteenth', 'the 14th century'], '14th century'],
    ['s2', 'How many years in a century?', ['100', 'one hundred', 'a hundred'], '100'],
    ['s2', 'What does CE stand for?', ['common era', 'the common era'], 'Common era'],
    ['s1', 'In which year was the UAE formed?', ['1971'], '1971'],
    ['s1', 'What word means "in order of time"?', ['chronological'], 'Chronological']
  ],
  chron: [['Put these events in order', ['Bronze Age settlement at Hili', 'Birth of the Prophet Muhammad', 'The Hijra', 'Battle of Hastings', 'Mansa Musa\'s pilgrimage', 'First World War', 'Formation of the UAE']], ['Earliest to latest', ['500 BCE', '100 BCE', 'CE 100', 'CE 500', '1066', '1971']]],
  match: [['Match the date to its century', [['1066', '11th century'], ['1324', '14th century'], ['1971', '20th century'], ['622', '7th century']]]],
  evid: [
    ['s1', 'Explain why getting the chronology wrong would damage a historian\'s explanation.', [['cause', 'causes'], ['before', 'after', 'order']], 'Causes must come before their effects. If events are in the wrong order, a historian might say something caused an event that actually happened afterwards, so the whole explanation would be wrong.'],
    ['s2', 'Explain how to work out the century of a date such as 1324.', [['add', 'plus', 'one more'], ['14', 'fourteenth', 'hundreds']], 'Take the hundreds (13) and add one, so 1324 is in the 14th century.']
  ],
  flash: [
    ['s1', 'Chronology', 'Arranging events in the order they happened.'], ['s1', 'Period', 'A length of time with shared features.'], ['s1', 'Time connectives', 'Firstly, then, next, after, finally.'],
    ['s2', 'BC / BCE', 'Before Christ / before common era: counting back from year 1.'], ['s2', 'AD / CE', 'Anno Domini / common era: counting forward from year 1.'], ['s2', 'Century of 1066?', '11th century.'],
    ['s2', 'Century of 1971?', '20th century.'], ['s2', 'Is there a year 0?', 'No: 1 BCE is followed by 1 CE.'], ['s2', 'Start of the Hijri calendar', 'The Hijra, 622 CE.'],
    ['s1', 'Mansa Musa\'s pilgrimage', '1324.'], ['s1', 'First World War', '1914–1918.'], ['s1', 'Formation of the UAE', '2 December 1971.']
  ],
  check: [
    ['describe', 'I can describe what chronology means.', ['s1']], ['describe', 'I can place key global and UAE events on a timeline.', ['s1']],
    ['explain', 'I can explain how BC/BCE and AD/CE dates work.', ['s2']], ['explain', 'I can work out the century of any date.', ['s2']],
    ['explain', 'I can explain a sequence using time connectives.', ['s1']], ['judge', 'I can judge why chronology matters for historical explanations.', ['s1']]
  ],
  exam: [
    writeQ({ type: 'explain', minutes: 6, q: 'Put these events in chronological order and give the century of each: the formation of the UAE; the Battle of Hastings; Mansa Musa\'s pilgrimage; the Hijra.', sections: ['s1', 's2'],
      asks: 'Sequence the events correctly and name the century of each.',
      steps: ['Write the date beside each event.', 'Order them earliest to latest.', 'Work out each century (hundreds + 1).'],
      plan: '1 minute recalling dates, 4 minutes ordering and working out centuries, 1 minute checking.',
      success: ['Correct order', 'Correct centuries', 'Dates included'], mistakes: ['Getting the century one out (1066 is NOT the 10th century)', 'Forgetting a date'],
      frame: { full: ['First came… in … (… century).', 'Next came… in … (… century).', 'Then… in … (… century).', 'Finally… in … (… century).'], some: ['Order + date + century for each'] } }),
    writeQ({ type: 'judge', q: '"Chronology is the most important skill a historian needs." How far do you agree?', sections: ['s1'],
      asks: 'Weigh chronology against other skills (evidence, inference, explaining causes) and reach a judgement.',
      steps: ['Explain why chronology matters, with an example.', 'Explain another skill that also matters.', 'Decide which matters more, using a qualifier.'],
      plan: '2 minutes planning, 9 minutes writing, 1 minute checking.',
      success: ['Qualified claim', 'Precise examples', 'Explaining connectives', 'Judgement'], mistakes: ['Only listing skills', 'No judgement'],
      frame: peej('P: I agree to some / a large extent that…', 'E: For example, without chronology…', 'E: This means that… However…', 'J: Overall…') })
  ],
  stretch: [['Resolving disagreement', 'If two accounts disagree on when something happened, how would a historian resolve it?'], ['Calendars', 'Why are the systems humans use to organise time themselves historical creations? Compare the Gregorian and Hijri calendars.'], ['Patterns', 'Find two events on the global timeline that happened in the same century in different parts of the world. What does comparing them tell you?'], ['Who decides?', 'Which events deserve a place on a timeline of world history, and who decides?']],
  planning: { title: 'Planning grid: why does chronology matter?', rows: ['Ordering causes', 'Spotting overlaps', 'Comparing places'], cols: ['Example', 'What goes wrong without it'], judgement: 'Chronology matters most because …' }
});

T({ ...base, id: 'y7-sk-3', order: 3, kt: 'Lessons 5–6', title: 'Asking questions and explaining causes',
  intro: 'Good history starts with a good question. This topic shows you how to turn a simple "when" question into a real enquiry, how sure we can be of a claim, and how historians explain why things happen, using Alphonse the Camel.',
  sections: [
    ['s1', '1. What makes a good historical question?', [
      'A factual question has one simple answer ("When did the UAE form?"). A historical enquiry asks "why", "how far" or "how significant", and needs evidence and judgement to answer.',
      'Historians are honest about how sure they are. The certainty continuum runs: Certain → Very likely → Likely → Possible → Uncertain.',
      'Qualifiers make your claims precise: "X was important" becomes "X was highly significant" or "X was somewhat significant". They show the strength of your argument.'
    ], ['enquiry', 'claim', 'certainty', 'qualifier'], ['Good enquiry stems: Why…? How far…? How significant…? How certain…?', 'Certainty continuum: certain → very likely → likely → possible → uncertain.']],
    ['s2', '2. Cause and consequence: Alphonse the Camel', [
      'Alphonse the Camel is loaded with more and more until one final straw makes him collapse. The obvious answer is "the straw caused it". But would that straw have mattered without everything already loaded? The final straw is the trigger, not the most important cause.',
      'Historians sort causes into:',
      ['Long-term causes: building up over years.', 'Short-term causes: happening shortly before.', 'Trigger: the immediate event that sets things off.', 'Underlying causes: the deeper conditions that made the event possible.'],
      'A consequence is a result of an event. Explaining connectives link causes to results: because, therefore, as a result, as a consequence, this meant that.',
      'A real example: in 1066 the death of Edward the Confessor (January) triggered a crisis, but the deeper cause was that he had no children, leaving several rival claimants to the throne.'
    ], ['cause', 'consequence', 'long-term', 'short-term', 'trigger', 'underlying cause', 'explaining connectives'], ['The trigger is not always the most important cause.', 'Edward the Confessor died in January 1066 without children.']]
  ],
  timeline: [
    ['5 January 1066', 'Edward the Confessor dies without children: the trigger of a succession crisis.'], ['6 January 1066', 'Harold Godwinson is crowned king.'],
    ['25 September 1066', 'Harold defeats Harald Hardrada at Stamford Bridge.'], ['28 September 1066', 'William of Normandy lands at Pevensey.'], ['14 October 1066', 'William wins the Battle of Hastings.']
  ],
  people: [['Alphonse the Camel', 'An imaginary camel used to show how many causes build up before a final trigger.'], ['Edward the Confessor', 'King of England who died childless in January 1066.']],
  vocab: [['Enquiry', 'A question that drives historical investigation.'], ['Claim', 'A statement a historian argues is true.'], ['Certainty', 'How sure we can be about a claim.'], ['Judgement', 'A reasoned conclusion based on evidence.'], ['Cause', 'Something that makes an event happen.'], ['Consequence', 'A result of an event.'], ['Long-term / short-term', 'Causes building over years, or shortly before.'], ['Trigger', 'The immediate cause that sets an event off.']],
  myths: [
    ['The last thing that happened is the most important cause.', 'The trigger is often the least important. Long-term causes usually matter more.'],
    ['Events have one cause.', 'Most events have several causes that work together.'],
    ['"Why" and "when" questions are equally good enquiries.', '"When" questions have one answer. "Why" and "how far" questions need evidence and judgement.']
  ],
  sources: [],
  mcq: [
    ['s1', 'Which is a historical ENQUIRY question?', ['When was the UAE formed?', 'Why did Dubai grow so quickly after 1966?', 'Who was Mansa Musa?', 'What is a century?'], 1, '"Why" questions need evidence and judgement.'],
    ['s1', 'What does a qualifier do?', ['Adds a date', 'Shows the strength of a claim', 'Names a source', 'Ends a paragraph'], 1, 'E.g. highly / somewhat / partly.'],
    ['s1', 'Which word sits in the middle of the certainty continuum?', ['Certain', 'Likely', 'Uncertain', 'Impossible'], 1, 'Certain → very likely → likely → possible → uncertain.'],
    ['s2', 'In the Alphonse story, the final straw is…', ['The most important cause', 'The trigger', 'A long-term cause', 'A consequence'], 1, 'It sets off the collapse but only matters because of everything already loaded.'],
    ['s2', 'Which is an explaining connective?', ['Firstly', 'Therefore', 'In 1066', 'Next'], 1, 'Therefore explains; firstly and next are time connectives.'],
    ['s2', 'A cause that builds up over many years is…', ['A trigger', 'Short-term', 'Long-term', 'A consequence'], 2, 'Long-term causes build slowly.'],
    ['s2', 'What triggered the succession crisis of 1066?', ['The Battle of Hastings', 'The death of Edward the Confessor', 'William landing at Pevensey', 'Stamford Bridge'], 1, 'Edward died in January 1066 without children.'],
    ['s2', 'A consequence is…', ['A cause', 'A result of an event', 'A type of source', 'A date'], 1, 'Consequence = result.']
  ],
  short: [
    ['s2', 'What is the immediate cause that sets off an event called?', ['trigger', 'the trigger'], 'Trigger'],
    ['s2', 'What is the result of an event called?', ['consequence', 'a consequence'], 'Consequence'],
    ['s1', 'Give one word that can begin a good enquiry question.', ['why', 'how far', 'how significant', 'how certain', 'how'], 'Why / How far / How significant'],
    ['s2', 'In which month and year did Edward the Confessor die?', ['january 1066', 'jan 1066'], 'January 1066'],
    ['s1', 'What do we call a word that shows the strength of a claim?', ['qualifier', 'a qualifier'], 'Qualifier']
  ],
  chron: [['Put the events of 1066 in order', ['Edward the Confessor dies', 'Harold is crowned', 'Battle of Stamford Bridge', 'William lands at Pevensey', 'Battle of Hastings']]],
  match: [['Match the term to its meaning', [['Trigger', 'Immediate cause that sets an event off'], ['Long-term cause', 'Builds up over many years'], ['Consequence', 'A result of an event'], ['Qualifier', 'Shows the strength of a claim']]]],
  evid: [
    ['s2', 'Using Alphonse the Camel, explain why the final event is not necessarily the most important cause.', [['straw', 'last', 'final', 'trigger'], ['already', 'loaded', 'everything else', 'build']], 'The final straw only made Alphonse collapse because he was already carrying a huge load. Without everything else, the straw would not have mattered, so it was the trigger, not the most important cause.'],
    ['s1', 'Improve this claim using a qualifier and a reason: "Oil was important for Dubai."', [['highly', 'very', 'extremely', 'partly', 'somewhat', 'significant'], ['because', 'therefore', 'this meant']], 'The discovery of oil in 1966 was highly significant for Dubai because it provided money to build infrastructure, which meant the city could grow much faster.']
  ],
  flash: [
    ['s1', 'Enquiry', 'A question that drives historical investigation.'], ['s1', 'Factual vs enquiry question', 'Factual: one simple answer. Enquiry: needs evidence and judgement (why / how far).'],
    ['s1', 'Certainty continuum', 'Certain → very likely → likely → possible → uncertain.'], ['s1', 'Qualifier', 'A word showing the strength of a claim, e.g. highly, somewhat, partly.'],
    ['s2', 'Trigger', 'The immediate cause that sets an event off.'], ['s2', 'Long-term cause', 'A cause building up over years.'], ['s2', 'Short-term cause', 'A cause happening shortly before an event.'],
    ['s2', 'Underlying cause', 'A deeper condition that made the event possible.'], ['s2', 'Consequence', 'A result of an event.'],
    ['s2', 'Explaining connectives', 'Because, therefore, as a result, as a consequence, this meant that.'], ['s2', 'Lesson of Alphonse the Camel', 'The final straw is the trigger, not necessarily the most important cause.'],
    ['s2', 'Trigger of the 1066 crisis', 'Edward the Confessor dying without children (January 1066).']
  ],
  check: [
    ['describe', 'I can describe the difference between a factual question and an enquiry question.', ['s1']], ['describe', 'I can describe long-term, short-term and trigger causes.', ['s2']],
    ['explain', 'I can explain why the trigger is not always the most important cause.', ['s2']], ['explain', 'I can use explaining connectives to link causes and consequences.', ['s2']],
    ['explain', 'I can use qualifiers to show how certain or how significant something is.', ['s1']], ['judge', 'I can judge which cause was most important and justify it.', ['s2']]
  ],
  exam: [
    writeQ({ type: 'judge', q: '"The final event is always the most important cause." How far do you agree? Use Alphonse the Camel and the events of 1066 in your answer.', sections: ['s2'],
      asks: 'Judge whether triggers matter most, using both the Alphonse model and a real example.',
      steps: ['Explain what a trigger is, using Alphonse.', 'Explain a deeper cause (e.g. Edward having no children).', 'Weigh them using qualifiers and reach a judgement.'],
      plan: '2 minutes planning, 9 minutes writing, 1 minute checking connectives.',
      success: ['Uses trigger / long-term correctly', 'Precise 1066 evidence', 'Explaining connectives', 'Qualified judgement'], mistakes: ['Retelling the Alphonse story without explaining', 'No real historical example', 'No judgement'],
      model: [{ t: 'I largely disagree, because the final event is usually only the trigger.', n: 'P: qualified claim.' }, { t: 'Alphonse only collapsed under the final straw because he was already carrying a huge load. Similarly, Edward the Confessor\'s death in January 1066 triggered a crisis, but the deeper cause was that he had no children.', n: 'E: model plus precise historical evidence.' }, { t: 'This meant several claimants believed they had a right to the throne, so a crisis was likely whenever Edward died.', n: 'E: explaining connective.' }, { t: 'Therefore the long-term cause was more important than the trigger.', n: 'J: judgement.' }],
      frame: peej('P: I agree / disagree to a large / some extent…', 'E: For example, Alphonse… / In 1066…', 'E: This meant that… therefore…', 'J: Overall, the most important cause was… because…') }),
    writeQ({ type: 'explain', minutes: 8, q: 'Turn this factual question into two good historical enquiry questions: "When was oil discovered in Dubai?" Explain why your questions are better.', sections: ['s1'],
      asks: 'Write two enquiry questions (why / how far / how significant) and explain what makes them better.',
      steps: ['Use a different enquiry stem for each.', 'Explain what evidence each would need.', 'Explain why each needs a judgement.'],
      plan: '2 minutes drafting questions, 5 minutes explaining, 1 minute checking.',
      success: ['Two genuine enquiry questions', 'Explains why they need evidence and judgement'], mistakes: ['Writing another "when" question', 'Not explaining'],
      frame: { full: ['Question 1: How significant…?', 'This is better because…', 'Question 2: Why…?', 'This is better because…'], some: ['Two questions + why each is better'] } })
  ],
  stretch: [['Too uncertain?', 'Can a question ever be too uncertain to be worth asking? Explain with an example.'], ['Necessary causes', 'Which cause was necessary, rather than simply important? What is the difference?'], ['Cause map', 'Draw a cause map for one event you know, with long-term, short-term and trigger causes linked by arrows. Label each arrow with a connective.'], ['Counterfactual', 'If Edward the Confessor had had a son, would 1066 still have been a crisis? Explain your reasoning.']],
  planning: { title: 'Planning grid: ranking causes', rows: ['Long-term cause', 'Short-term cause', 'Trigger'], cols: ['Precise evidence', 'How it led to the event', 'Most / quite / least important'], judgement: 'The most important cause was … because … This meant that … Therefore …' }
});

T({ ...base, id: 'y7-sk-4', order: 4, kt: 'Lessons 7–8', title: 'Perspective, interpretation and ethics',
  intro: 'People at the time saw events from where they stood. People later explain them in different ways. And we have to decide whether we judge the past by today\'s values. This topic covers perspective, interpretation and the ethical dimension of history.',
  sections: [
    ['s1', '1. Perspective or interpretation?', [
      'Imagine a controversial decision in a football match. The referee, a winning supporter, a losing supporter and a player all see it differently, because of where they stand, what they know and what matters to them.',
      'A perspective is the viewpoint of someone experiencing events at the time. An interpretation is a later explanation or representation of the past, made by a historian, film-maker or museum.',
      'Mansa Musa\'s 1324 journey through Cairo shows both. Writers in Cairo recorded how much gold he spent, from their own perspective. In 1375 the Catalan Atlas, a map made in Europe, pictured him holding a gold nugget: a later interpretation that shows how Europeans saw Mali\'s wealth.',
      'Historians disagree for more complicated reasons than "everyone has an opinion". They may ask different questions, use different evidence or weigh it differently. Qualifiers such as "to a large extent" help you agree or disagree without absolute language.'
    ], ['perspective', 'interpretation', 'viewpoint', 'context'], ['Perspective = at the time. Interpretation = later.', 'Catalan Atlas, 1375: Mansa Musa shown holding gold.']],
    ['s2', '2. The ethical dimension', [
      'Should we judge people in the past by today\'s standards? Judging the past only by modern values is called presentism. But understanding the past is not the same as excusing it.',
      'Historians ask: What happened? What values existed at the time? Did everybody agree? Who benefited? Who suffered? Often people at the time disagreed too, which shows that some actions were questioned even then.',
      'A balanced judgement can use the frame: On one hand… However… This showed that… Therefore… Use qualifiers to avoid absolute judgements.'
    ], ['ethical', 'values', 'context', 'contemporary', 'presentism'], ['Understanding is not excusing.', 'Ask: did everybody agree at the time?']]
  ],
  timeline: [
    ['c. 1312', 'Mansa Musa becomes ruler of the Mali Empire.'], ['1324', 'Mansa Musa travels through Cairo on pilgrimage to Mecca, spending and giving away large amounts of gold.'],
    ['c. 1337', 'Mansa Musa dies.'], ['c. 1340s', 'The scholar al-Umari records accounts from people in Cairo who remembered Mansa Musa\'s visit.'], ['1375', 'The Catalan Atlas, made in Majorca, shows Mansa Musa holding a gold nugget.']
  ],
  people: [['Mansa Musa', 'Ruler of Mali, famous for his wealth and his 1324 pilgrimage.'], ['al-Umari', 'Scholar who, in the 1340s, wrote down Cairo memories of Mansa Musa\'s visit.']],
  vocab: [['Perspective', 'The viewpoint of someone experiencing events at the time.'], ['Interpretation', 'A later explanation or representation of the past.'], ['Viewpoint', 'The position from which someone sees something.'], ['Context', 'The circumstances surrounding an event.'], ['Presentism', 'Judging the past using only today\'s standards.'], ['Ethical', 'Concerned with what is right and wrong.'], ['Values', 'The beliefs a person or society holds about right and wrong.'], ['Contemporary', 'Existing or happening at the same time.']],
  myths: [
    ['Historians disagree because everyone has an opinion.', 'They disagree because they ask different questions, use different evidence or weigh it differently.'],
    ['Understanding why people acted is the same as excusing them.', 'Understanding is not excusing. Historians explain actions and can still judge them.'],
    ['Everyone in the past agreed with the values of their time.', 'People often disagreed then too. Look for those voices.'],
    ['A perspective and an interpretation are the same.', 'A perspective is from the time; an interpretation is made later.']
  ],
  sources: [{ id: 'catalan', title: 'The Catalan Atlas', type: 'Illustrated map (visual source)', date: '1375', origin: 'Made in Majorca, attributed to the workshop of Abraham Cresques; now held by the Bibliothèque nationale de France.', purpose: 'A world map for a European royal owner, showing known places, rulers and trade.', usefulness: 'Shows that Mali\'s wealth was famous in Europe by the 1370s. It is a European interpretation, not a Malian account.' }],
  mcq: [
    ['s1', 'A perspective is…', ['A later explanation of the past', 'The viewpoint of someone at the time', 'A type of map', 'A date'], 1, 'Perspective = from inside the time.'],
    ['s1', 'An interpretation is…', ['Made at the time', 'A later explanation or representation of the past', 'Always wrong', 'Only written by kings'], 1, 'Interpretations are made later.'],
    ['s1', 'In 1375 the Catalan Atlas showed Mansa Musa…', ['Fighting a battle', 'Holding a gold nugget', 'Sailing to America', 'Building a fort'], 1, 'It shows how famous Mali\'s wealth was in Europe.'],
    ['s1', 'Why do historians disagree?', ['Everyone just has an opinion', 'They ask different questions, use different evidence or weigh it differently', 'Some are lying', 'They never read sources'], 1, 'Disagreement has reasons.'],
    ['s2', 'Presentism means…', ['Studying the present', 'Judging the past only by today\'s standards', 'A gift', 'Ignoring the past'], 1, 'Presentism ignores context.'],
    ['s2', 'Which question helps an ethical judgement?', ['What colour was it?', 'Did everybody agree at the time?', 'How long was the book?', 'What is the page number?'], 1, 'Disagreement at the time matters.'],
    ['s1', 'Which qualifier avoids absolute language?', ['Definitely', 'Always', 'To some extent', 'Never'], 2, 'Qualifiers make claims precise.'],
    ['s2', '"Understanding is not excusing" means…', ['If we understand, we must forgive', 'Explaining why people acted does not mean approving of it', 'We should not study bad events', 'Values never change'], 1, 'Historians explain and can still judge.']
  ],
  short: [
    ['s1', 'In which year did Mansa Musa pass through Cairo on pilgrimage?', ['1324'], '1324'],
    ['s1', 'Which 1375 map pictured Mansa Musa?', ['catalan atlas', 'the catalan atlas'], 'The Catalan Atlas'],
    ['s2', 'What word means judging the past only by today\'s standards?', ['presentism'], 'Presentism'],
    ['s1', 'A viewpoint from someone living at the time is a…', ['perspective'], 'Perspective'],
    ['s2', 'What word means the circumstances surrounding an event?', ['context'], 'Context']
  ],
  chron: [['Put these in order', ['Mansa Musa becomes ruler of Mali', 'Mansa Musa passes through Cairo', 'Mansa Musa dies', 'al-Umari records Cairo memories', 'The Catalan Atlas is made']]],
  match: [['Match the term to its meaning', [['Perspective', 'Viewpoint of someone at the time'], ['Interpretation', 'Later explanation of the past'], ['Presentism', 'Judging the past by today\'s standards only'], ['Context', 'Circumstances surrounding an event']]]],
  evid: [
    ['s1', 'Explain why the Catalan Atlas is an interpretation rather than a perspective on Mansa Musa\'s pilgrimage.', [['1375', 'later', 'after'], ['europe', 'european', 'majorca', 'not there', 'did not see']], 'It was made in 1375, about 50 years after the pilgrimage, by mapmakers in Majorca who had not witnessed it. So it is a later European representation, not the viewpoint of someone who was there.'],
    ['s2', 'Explain why "understanding historical actions is not the same as excusing them".', [['understand', 'explain', 'context'], ['judge', 'excuse', 'right', 'wrong', 'agree']], 'Understanding the context explains why people acted as they did, but historians can still judge whether actions were right, especially when people at the time disagreed too.']
  ],
  flash: [
    ['s1', 'Perspective', 'The viewpoint of someone experiencing events at the time.'], ['s1', 'Interpretation', 'A later explanation or representation of the past.'], ['s1', 'Catalan Atlas', '1375 European map showing Mansa Musa holding gold: an interpretation.'],
    ['s1', 'al-Umari', '1340s scholar who recorded Cairo memories of Mansa Musa.'], ['s1', 'Why historians disagree', 'Different questions, evidence or weighting.'], ['s1', 'Qualifiers for agreeing', 'To a large extent / to some extent / partly.'],
    ['s2', 'Presentism', 'Judging the past only by today\'s standards.'], ['s2', 'Ethical', 'Concerned with right and wrong.'], ['s2', 'Five ethical questions', 'What happened? What values existed? Did everybody agree? Who benefited? Who suffered?'],
    ['s2', 'Balanced judgement frame', 'On one hand… However… This showed that… Therefore…'], ['s2', 'Contemporary', 'Existing or happening at the same time.'], ['s2', 'Understanding vs excusing', 'Explaining why people acted is not the same as approving.']
  ],
  check: [
    ['describe', 'I can describe the difference between a perspective and an interpretation.', ['s1']], ['describe', 'I can describe how Mansa Musa was seen in 1324 and in 1375.', ['s1']],
    ['explain', 'I can explain why historians reach different conclusions.', ['s1']], ['explain', 'I can explain what presentism is and why historians avoid it.', ['s2']],
    ['judge', 'I can reach a balanced ethical judgement using "On one hand… However… Therefore…".', ['s2']], ['judge', 'I can agree or disagree with an interpretation using qualifiers.', ['s1']]
  ],
  exam: [
    writeQ({ type: 'judge', q: '"We should not judge people in the past by today\'s standards." How far do you agree?', sections: ['s2'],
      asks: 'Weigh presentism against the need to judge actions, using the idea that people at the time also disagreed.',
      steps: ['Explain why context matters.', 'Explain why we can still judge (e.g. people disagreed at the time).', 'Reach a qualified judgement.'],
      plan: '2 minutes planning, 9 minutes writing, 1 minute checking.', success: ['Qualified claim', 'Uses context and presentism', 'Balanced', 'Judgement'], mistakes: ['Only giving your opinion', 'Absolute language ("always", "never")'],
      frame: peej('P: On one hand, I agree to some extent that…', 'E: This is because the values at the time were… For example…', 'E: However, this showed that… because people at the time…', 'J: Therefore, overall…') }),
    writeQ({ type: 'explain', minutes: 10, q: 'Explain why people at the time and historians later might see the same event differently. Use an example.', sections: ['s1'],
      asks: 'Explain the difference between perspective and interpretation, with a precise example.',
      steps: ['Define perspective and interpretation.', 'Give an example of each (e.g. Cairo memories vs Catalan Atlas).', 'Explain why they differ.'],
      plan: '2 minutes planning, 7 minutes writing, 1 minute checking.', success: ['Accurate definitions', 'Precise example', 'Explains reasons for difference'], mistakes: ['Mixing up the two terms', 'No example'],
      frame: peej('P: People at the time saw events from their own perspective, whereas…', 'E: For example, in 1324… but in 1375 the Catalan Atlas…', 'E: This is because…', 'J: Therefore…') })
  ],
  stretch: [['Same evidence', 'Why might two historians using the same evidence reach different conclusions? Give two reasons.'], ['Ideas not yet invented', 'Can a society be judged by ideas that had not been invented yet? Argue both sides.'], ['Whose interpretation?', 'Who made the Catalan Atlas, and how might a Malian griot (oral historian) have told Mansa Musa\'s story differently?'], ['Football to history', 'Design your own "same event, different seats" scenario for a historical event, with four viewpoints.']],
  planning: { title: 'Planning grid: perspectives on one event', rows: ['Person 1', 'Person 2', 'A later interpretation'], cols: ['What they knew', 'What mattered to them', 'How they saw the event'], judgement: 'Their views differ mainly because …' }
});

T({ ...base, id: 'y7-sk-5', order: 5, kt: 'Lessons 9–11', title: 'Significance, change and writing like a historian',
  intro: 'Who decides what deserves to be remembered? Does history always move forwards? And how do you turn all of this into a convincing argument? This topic finishes the unit with significance, change and continuity, and the Arcadia way of writing like a historian.',
  sections: [
    ['s1', '1. Historical significance', [
      'Important is not the same as historically significant. Historians judge significance using criteria, not personal preference:',
      ['Scale: how many people were affected?', 'Impact: how much changed because of it?', 'Duration: how long did the effects last?', 'Revealing: what does it tell us about the time?', 'Remembered: how and why is it remembered today?'],
      'Significance can change over time, and something can be highly significant to one group and less so to another. Use "highly significant / somewhat significant / less significant" and then explain why.'
    ], ['significance', 'criteria', 'impact', 'legacy'], ['Criteria: scale, impact, duration, revealing, remembered.']],
    ['s2', '2. Change and continuity', [
      'Change is something becoming different over time; continuity is something staying the same. Change can be rapid or gradual. A turning point is a moment after which things changed significantly.',
      'Change is not always progress (change for the better). It can be decline (change for the worse), or progress for one group and decline for another. Dubai shows rapid change after oil was discovered in 1966, the UAE was formed in 1971 and new infrastructure was built, alongside continuities such as heritage, language and family traditions.',
      'Time connectives plus explaining connectives help you explain change: Firstly… Then… As a result… This meant that… Therefore…'
    ], ['change', 'continuity', 'turning point', 'progress', 'decline'], ['Oil discovered in Dubai: 1966.', 'UAE formed: 1971.']],
    ['s3', '3. Writing like a historian: the Arcadia paragraph', [
      'A strong historical paragraph is not just a list of facts. It is an argument. The Arcadia IGCSE writing model uses five moves, which fit into PEEJ. In lessons each one has its own colour:',
      ['Topic sentence with a qualifier (blue): One key reason … / To a large extent … / On the other hand …', 'Time connectives (green): At the start … / Later … / Eventually … / Finally …', 'Precisely selected evidence (purple): a name, date, number or source.', 'Arguing connectives (red): However … / This was more important because … / In contrast …', 'Judgement: This shows that … / Overall, the most important reason was … / Therefore, I agree to a large/limited extent …'],
      'Ask yourself: What is my argument? How strongly do I want to claim it? Which evidence best proves it? How do I explain the link?'
    ], ['argument', 'claim', 'qualifier', 'topic sentence', 'time connective', 'arguing connective', 'precise evidence', 'judgement', 'PEEJ'], ['PEEJ: Point (topic sentence + qualifier) → Evidence (precise, in time order) → Explain (arguing connective) → Judgement.']]
  ],
  timeline: [
    ['1833', 'The Al Maktoum family settle at Dubai.'], ['1966', 'Oil is discovered offshore in Dubai.'], ['1971', 'The UAE is formed on 2 December.'],
    ['1979', 'The Dubai World Trade Centre opens.'], ['1985', 'Emirates airline is founded.'], ['2010', 'The Burj Khalifa opens.']
  ],
  people: [],
  vocab: [['Significance', 'How important an event or person is judged to be.'], ['Criteria', 'The standards used to judge something.'], ['Impact', 'The effect an event had.'], ['Legacy', 'What remains or is remembered after an event.'], ['Change', 'Something becoming different over time.'], ['Continuity', 'Something staying the same over time.'], ['Turning point', 'A moment after which things changed significantly.'], ['Progress / decline', 'Change for the better / for the worse.'], ['Argument', 'A claim supported by evidence and reasoning.'], ['Qualifier', 'A word that shows the strength of a claim.'], ['Topic sentence', 'The first sentence of a paragraph, which states your argument with a qualifier.'], ['Time connective', 'A word or phrase that shows when or in what order things happened (Later…, Eventually…).'], ['Arguing connective', 'A word or phrase that explains or weighs evidence (However…, This was more important because…).']],
  myths: [
    ['Significant just means "I think it is important".', 'Significance is judged against criteria such as scale, impact and duration.'],
    ['Change always means progress.', 'Change can be decline, or progress for some and decline for others.'],
    ['More facts make a better paragraph.', 'A paragraph full of facts can still be a poor argument. Facts must be selected and explained.'],
    ['Significance never changes.', 'What people think is significant can change over time.']
  ],
  sources: [],
  mcq: [
    ['s1', 'Which is NOT one of the significance criteria used in this unit?', ['Scale', 'Impact', 'Duration', 'Colour'], 3, 'Scale, impact, duration, revealing, remembered.'],
    ['s1', 'Historical significance is judged by…', ['Personal preference', 'Criteria', 'How old something is', 'How famous a person is on social media'], 1, 'Criteria, not opinion.'],
    ['s2', 'Continuity means…', ['Something changing fast', 'Something staying the same over time', 'A turning point', 'Decline'], 1, 'Continuity = staying the same.'],
    ['s2', 'Oil was discovered in Dubai in…', ['1833', '1966', '1971', '2010'], 1, '1966.'],
    ['s2', 'A turning point is…', ['A moment after which things changed significantly', 'A slow change', 'Something staying the same', 'A type of source'], 0, 'After it, things were different.'],
    ['s3', 'In PEEJ, the first E stands for…', ['Example of a qualifier', 'Precise evidence', 'Ending', 'Essay'], 1, 'Point, Evidence, Explain, Judgement.'],
    ['s3', 'Which sentence uses a qualifier?', ['Oil happened in 1966.', 'Oil was highly significant for Dubai.', 'Dubai is a city.', 'In 1971 the UAE formed.'], 1, '"Highly" shows strength of claim.'],
    ['s2', 'Which statement is most accurate?', ['Change is always progress', 'Change can be progress for one group and decline for another', 'Nothing in Dubai stayed the same', 'Continuity is always bad'], 1, 'Ask: progress for whom?']
  ],
  short: [
    ['s1', 'Name two significance criteria.', ['scale impact', 'scale and impact', 'impact duration', 'duration', 'scale', 'impact', 'revealing', 'remembered'], 'Scale, impact, duration, revealing, remembered'],
    ['s2', 'When was the UAE formed?', ['1971', '2 december 1971'], '2 December 1971'],
    ['s2', 'Change for the worse is called…', ['decline'], 'Decline'],
    ['s3', 'What does the J in PEEJ stand for?', ['judgement', 'judgment'], 'Judgement'],
    ['s2', 'Something staying the same over time is…', ['continuity'], 'Continuity']
  ],
  chron: [['Dubai: put these in order', ['Al Maktoum family settle at Dubai', 'Oil discovered offshore', 'UAE formed', 'Dubai World Trade Centre opens', 'Emirates founded', 'Burj Khalifa opens']]],
  match: [['Match the criterion to its question', [['Scale', 'How many people were affected?'], ['Impact', 'How much changed because of it?'], ['Duration', 'How long did the effects last?'], ['Revealing', 'What does it tell us about the time?']]], ['Match the PEEJ step', [['P', 'Qualified claim'], ['E (first)', 'Precise evidence'], ['E (second)', 'Explain with a connective'], ['J', 'Judgement']]]],
  evid: [
    ['s1', 'Use at least two criteria to explain why the discovery of oil in 1966 was significant for Dubai.', [['scale', 'impact', 'duration', 'many people', 'lasting'], ['1966', 'oil'], ['because', 'therefore', 'this meant']], 'The discovery of oil in 1966 was highly significant. Its impact was huge because oil money paid for roads, ports and housing. Its duration is long because that infrastructure still shapes Dubai today.'],
    ['s2', 'Give one example of change and one of continuity in Dubai since 1966.', [['change', 'grew', 'built', 'airport', 'towers', 'roads', 'burj'], ['continuity', 'same', 'heritage', 'tradition', 'language', 'family', 'creek']], 'Change: the city grew rapidly, with new infrastructure such as the Dubai World Trade Centre (1979). Continuity: heritage and traditions, such as Arabic language and family customs, remained important.']
  ],
  flash: [
    ['s1', 'Significance', 'How important an event or person is judged to be, using criteria.'], ['s1', 'Five significance criteria', 'Scale, impact, duration, revealing, remembered.'], ['s1', 'Can significance change?', 'Yes. It can change over time and differ between groups.'],
    ['s2', 'Change vs continuity', 'Becoming different vs staying the same.'], ['s2', 'Turning point', 'A moment after which things changed significantly.'], ['s2', 'Progress vs decline', 'Change for the better vs for the worse.'],
    ['s2', 'Oil discovered in Dubai', '1966.'], ['s2', 'Burj Khalifa opened', '2010.'], ['s3', 'PEEJ', 'Point (qualified) → Evidence (precise) → Explain (connective) → Judgement.'],
    ['s3', 'Example qualifiers', 'Highly, considerably, partly, to some extent.'], ['s3', 'Explaining connectives', 'Because, this meant that, as a result, therefore.'], ['s3', 'Can lots of facts make a poor argument?', 'Yes, if they are not selected and explained.']
  ],
  check: [
    ['describe', 'I can describe the five significance criteria.', ['s1']], ['describe', 'I can describe examples of change and continuity in Dubai.', ['s2']],
    ['explain', 'I can explain why change is not always progress.', ['s2']], ['explain', 'I can explain the four moves of an Arcadia/PEEJ paragraph.', ['s3']],
    ['judge', 'I can judge how significant an event was using criteria.', ['s1']], ['judge', 'I can write a qualified, evidence-supported judgement paragraph.', ['s3']]
  ],
  exam: [
    writeQ({ type: 'judge', q: 'Which was more significant for Dubai: the discovery of oil in 1966 or the formation of the UAE in 1971? Write one Arcadia (PEEJ) paragraph.', sections: ['s1', 's3'],
      asks: 'Make a qualified judgement between the two, using significance criteria and precise evidence.',
      steps: ['Decide which and how strongly (qualifier).', 'Choose your best piece of evidence.', 'Explain using a criterion and a connective.', 'End with a judgement that compares both.'],
      plan: '2 minutes planning, 9 minutes writing, 1 minute checking for the four moves.',
      success: ['Qualified claim', 'Precise evidence (dates, examples)', 'Uses a significance criterion', 'Explaining connective', 'Judgement comparing both'], mistakes: ['Describing both without deciding', 'No criteria', 'Unqualified claims'],
      model: [{ t: 'The discovery of oil in 1966 was arguably more significant for Dubai than the formation of the UAE, to a large extent because of its economic impact.', n: 'P: qualified claim.' }, { t: 'Oil revenue paid for new infrastructure, which helped projects such as the Dubai World Trade Centre, opened in 1979.', n: 'E: precise evidence.' }, { t: 'This meant Dubai could grow far faster than before, and as a result it became a centre of trade and travel.', n: 'E: explaining connectives.' }, { t: 'However, the formation of the UAE in 1971 gave Dubai security and unity, so overall oil was more significant for growth, while 1971 was more significant politically.', n: 'J: judgement that compares.' }],
      frame: peej('P: … was highly / somewhat more significant than … because…', 'E: For example, in …', 'E: This meant that… As a result… Therefore…', 'J: Overall, … was more significant because…') }),
    writeQ({ type: 'explain', minutes: 10, q: '"History isn\'t simply a story of progress." Explain this statement using an example of change in Dubai.', sections: ['s2'],
      asks: 'Show that change can be progress, decline or both, depending on who is affected.',
      steps: ['Pick one development.', 'Explain how it was progress for one group.', 'Explain how it might be decline or loss for another, or what stayed the same.'],
      plan: '2 minutes planning, 7 minutes writing, 1 minute checking.', success: ['Precise example', 'Progress for whom?', 'Continuity or decline considered'], mistakes: ['Saying everything got better', 'No precise example'],
      frame: peej('P: History is not simply progress because…', 'E: For example, after 1966…', 'E: This meant that for … it was progress, but for …', 'J: Therefore…') })
  ],
  stretch: [['Significance to whom?', 'Could something be significant to one group and insignificant to another? Give an example.'], ['Progress and decline', 'Choose one change. Could it be progress for one group but decline for another?'], ['Good facts, poor argument', 'Can a paragraph contain lots of accurate facts and still be a poor historical argument? Rewrite a fact-list paragraph into an argument.'], ['Cold write review', 'Look back at your first Dubai paragraph from Lesson 1. Rewrite one sentence using a qualifier, precise evidence and an explaining connective.']],
  planning: { title: 'Planning grid: significance', rows: ['Event A', 'Event B'], cols: ['Scale', 'Impact', 'Duration', 'Revealing', 'Remembered'], judgement: 'Overall, … was more significant because …' }
});
console.log('Year 7 topics written');
