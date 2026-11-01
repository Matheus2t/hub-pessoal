import json
from pathlib import Path
root=Path('frontend/public/learn')
rows=[];topic=part=''
for line in Path('scripts/learn/vocabulary.tsv').read_text(encoding='utf-8-sig').splitlines():
 if line.startswith('@'):topic,part=line[1:].split('|');continue
 stable,*fields=line.split('|');assert len(fields)==6,line
 rows.append((fields,topic,part,stable))
assert len(rows)==150,len(rows)
phrases=[l.split('|') for l in Path('scripts/learn/phrases.tsv').read_text(encoding='utf-8-sig').splitlines()]
assert len(phrases)==50
assert len({r[3] for r in rows})==150, 'Duplicate vocabulary ID'
assert len({r[0] for r in phrases})==50, 'Duplicate phrase ID'
translation_variants={'001':['oi'],'002':['até mais','tchau'],'004':['obrigada'],'007':['com licença','perdão'],'009':['boa noite'],'010':['bem-vinda','bem-vindos','bem-vindas'],'021':['uma'],'022':['duas']}
for language,column in [('en',0),('ru',1)]:
 words=[]
 for index,(f,topic,part,stable) in enumerate(rows):
  name=f[column];word=dict(id=f'{language}-word-{stable}',language=language,word=name,translation=f[2],example=f[3+column],exampleTranslation=f[5],level='A2' if f[0] in {'receipt','colleague','job','university','exam','journey','password','website','file','screen','pharmacy','understand','remember','important','expensive','cheap','difficult','travel'} else 'A1',topic=topic,part=part)
  if stable in {'021','022','023','024','025','026'}:word['part']='numeral'
  if stable in {'027','028','029','098','099'}:word['part']='advérbio'
  if stable in translation_variants:word['translationVariants']=translation_variants[stable]
  if language=='ru' and word['part']=='substantivo':
   gender={'мама':'feminino','папа':'masculino','семья':'feminino','сестра':'feminino','брат':'masculino','друг':'masculino','ребёнок':'masculino','имя':'neutro','кофе':'masculino','молоко':'neutro','коллега':'comum','люди':'plural','родители':'plural','деньги':'plural','овощи':'plural','фрукты':'plural','одежда':'feminino','обувь':'feminino','дверь':'feminino','тетрадь':'feminino'}
   gender.update({'кровать':'feminino','пароль':'masculino','учитель':'masculino'})
   word['gender']=gender.get(name,'feminino' if name.endswith(('а','я')) else 'neutro' if name.endswith(('о','е')) else 'masculino')
  if language=='ru':
   table=dict(zip('абвгдеёжзийклмнопрстуфхцчшщъыьэюя',['a','b','v','g','d','e','yo','zh','z','i','y','k','l','m','n','o','p','r','s','t','u','f','kh','ts','ch','sh','shch','ʺ','y','ʹ','e','yu','ya']))
   word['transliteration']=''.join(table.get(c.lower(),c).capitalize() if c.isupper() else table.get(c,c) for c in name)
  words.append(word)
 contextual=[]
 for index,row in enumerate(phrases):
  stable,*f=row
  contextual.append(dict(id=f'{language}-phrase-{stable}',language=language,word=f[column],translation=f[2],example=f[column],exampleTranslation=f[2],level='A1' if stable in {'008','009','010','013','015','016','017','020','030','031','032','033','036'} else 'A2',topic='Expressões contextualizadas',part='frase'))
 exercises=[]
 for index,w in enumerate(words[:30]):exercises.append(dict(id=f"{language}-listening-{w['id'].rsplit('-',1)[1]}",language=language,skill='listening',topic=w['topic'],level=w['level'],prompt='Ouça e escreva o significado em português.',answers=[w['translation'],*w.get('translationVariants',[])],audio=w['word'],explanation=f"A palavra ou expressão significa «{w['translation']}». Observe o exemplo: {w['exampleTranslation']}",wordIds=[w['id']]))
 for index,w in enumerate([words[16]]+words[31:60]):exercises.append(dict(id=f"{language}-dictation-{w['id'].rsplit('-',1)[1]}",language=language,skill='dictation',topic=w['topic'],level=w['level'],prompt='Escreva exatamente a frase que ouviu.',answers=[w['example']],audio=w['example'],explanation=f"Sentido da frase: {w['exampleTranslation']}",wordIds=[w['id']],acceptYoAsE=False))
 for index,w in enumerate(words[60:100]):exercises.append(dict(id=f"{language}-writing-{w['id'].rsplit('-',1)[1]}",language=language,skill='writing',topic=w['topic'],level=w['level'],prompt=f"Traduza: {w['exampleTranslation']}",answers=[w['example']],explanation=f"Compare sua construção com a forma cadastrada. Palavra de apoio: {w['word']} ({w['translation']}). Outras traduções podem ser válidas, mas esta correção compara apenas variantes cadastradas.",wordIds=[w['id']]))
 (root/f'{language}.json').write_text(json.dumps(dict(language=language,version=1,words=words,phrases=contextual,exercises=exercises),ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Each language: 150 words, 50 phrases, 30 listening, 30 dictation, 40 writing; 300 items.')

# Explicit, meaning-preserving writing variants; never semantic guessing.
variants={
 'Please close the door.':['Close the door, please.'],
 'Open the window, please.':['Please open the window.'],
 'Put the keys on the table.':['Place the keys on the table.'],
 'My bag is under the chair.':['My bag is underneath the chair.'],
 'Please take off your shoes.':['Take off your shoes, please.'],
 'Your answer is correct.':['Your answer is right.'],
 'I cannot find my key.':["I can't find my key."],
 'Пожалуйста, закройте дверь.':['Закройте дверь, пожалуйста.'],
 'Откройте окно, пожалуйста.':['Пожалуйста, откройте окно.'],
 'Положите ключи на стол.':['Ключи положите на стол.'],
 'Пожалуйста, снимите обувь.':['Снимите обувь, пожалуйста.'],
 'Ваш ответ правильный.':['Ваш ответ верный.'],
 'Он ездит на работу на велосипеде.':['Он ездит на велосипеде на работу.'],
 'This chair is free.':['This chair is available.'],
 'This book has many pictures.':['There are many pictures in this book.'],
 'The exam is on Friday.':['The test is on Friday.'],
 'The bus stops here.':['The bus stops right here.'],
 'I need a return ticket.':['I need a round-trip ticket.'],
 'Our hotel is in the city centre.':['Our hotel is in the city center.'],
 'I have a question about this word.':["I've got a question about this word."],
 'He rides a bicycle to work.':['He cycles to work.','He rides a bike to work.'],
 'Я не могу найти ключ.':['Я не могу найти свой ключ.'],
 'У меня вопрос об этом слове.':['У меня есть вопрос об этом слове.'],
 'Экзамен в пятницу.':['Экзамен будет в пятницу.'],
 'Наша гостиница в центре города.':['Наш отель в центре города.']
}
for language in ['en','ru']:
 p=root/f'{language}.json';c=json.loads(p.read_text(encoding='utf-8'))
 for e in c['exercises']:
  if e['skill']=='writing':e['answers']+=variants.get(e['answers'][0],[])
 p.write_text(json.dumps(c,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

# Additive Stage C content; existing vocabulary and exercise IDs are untouched.
import runpy
build_extended=runpy.run_path('scripts/learn/extended-content.py')['build_extended']
for language in ['en','ru']:
 p=root/f'{language}.json';c=json.loads(p.read_text(encoding='utf-8'));extra=build_extended(language)
 c['readings']=extra['readings'];c['lessons']=extra['lessons'];c['exercises']+=extra['exercises']
 p.write_text(json.dumps(c,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Stage C per language: 10 readings/30 questions, 10 lessons/30 exercises, 30 assessment questions.')
