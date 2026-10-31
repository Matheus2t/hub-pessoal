import json,re,unicodedata
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
for language,column in [('en',0),('ru',1)]:
 words=[]
 for index,(f,topic,part,stable) in enumerate(rows):
  name=f[column];word=dict(id=f'{language}-word-{stable}',language=language,word=name,translation=f[2],example=f[3+column],exampleTranslation=f[5],level='A2' if f[0] in {'receipt','colleague','job','university','exam','journey','password','website','file','screen','pharmacy','understand','remember','important','expensive','cheap','difficult','travel'} else 'A1',topic=topic,part=part)
  if index in range(20,26):word['part']='numeral'
  if index in range(26,29) or index in [97,98]:word['part']='advérbio'
  if language=='ru' and word['part']=='substantivo':
   gender={'мама':'feminino','папа':'masculino','семья':'feminino','сестра':'feminino','брат':'masculino','друг':'masculino','ребёнок':'masculino','имя':'neutro','кофе':'masculino','молоко':'neutro','коллега':'comum','люди':'plural','родители':'plural','деньги':'plural','овощи':'plural','фрукты':'plural','одежда':'feminino','обувь':'feminino','дверь':'feminino','тетрадь':'feminino'}
   word['gender']=gender.get(name,'feminino' if name.endswith(('а','я')) else 'neutro' if name.endswith(('о','е')) else 'masculino')
  if language=='ru':
   table=dict(zip('абвгдеёжзийклмнопрстуфхцчшщъыьэюя',['a','b','v','g','d','e','yo','zh','z','i','y','k','l','m','n','o','p','r','s','t','u','f','kh','ts','ch','sh','shch','ʺ','y','ʹ','e','yu','ya']))
   word['transliteration']=''.join(table.get(c.lower(),c).capitalize() if c.isupper() else table.get(c,c) for c in name)
  words.append(word)
 contextual=[]
 for index,row in enumerate(phrases):
  stable,*f=row
  contextual.append(dict(id=f'{language}-phrase-{stable}',language=language,word=f[column],translation=f[2],example=f[column],exampleTranslation=f[2],level='A1' if index<20 else 'A2',topic='Expressões contextualizadas',part='frase'))
 exercises=[]
 for index,w in enumerate(words[:30]):exercises.append(dict(id=f"{language}-listening-{w['id'].rsplit('-',1)[1]}",language=language,skill='listening',topic=w['topic'],level=w['level'],prompt='Ouça e escreva o significado em português.',answers=[w['translation']],audio=w['word'],explanation=f"A palavra ou expressão significa «{w['translation']}». Observe o exemplo: {w['exampleTranslation']}",wordIds=[w['id']]))
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
 'Положите ключи на стол.':['Пожалуйста, положите ключи на стол.'],
 'Пожалуйста, снимите обувь.':['Снимите обувь, пожалуйста.'],
 'Ваш ответ правильный.':['Ваш ответ верный.'],
 'Он ездит на работу на велосипеде.':['Он ездит на велосипеде на работу.']
}
for language in ['en','ru']:
 p=root/f'{language}.json';c=json.loads(p.read_text(encoding='utf-8'))
 for e in c['exercises']:
  if e['skill']=='writing':e['answers']+=variants.get(e['answers'][0],[])
 p.write_text(json.dumps(c,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
