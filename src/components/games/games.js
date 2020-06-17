import SavannahController from './savannah/savannahController';
import PuzzleController from './puzzle/puzzleController';
import AudiocallController from './audiocall/audiocallController';
import SpeakitController from './speakit/speakitController';
import SprintController from './sprint/sprintController';
import { createElement } from '../../utils';

export default class Games {
  constructor() {
    this.count = 10;
  }

  create(name) {
    const main = document.getElementById('main');
    main.append(this.createBegin());
    main.append(this.createEndGame());
    switch (name) {
      case 'savannah':
        new SavannahController(this.user, this.endGame).createEvent();
        break;
      case 'puzzle':
        new PuzzleController(this.user, this.endGame).createEvent();
        break;
      case 'audiocall':
        new AudiocallController(this.user, this.endGame).createEvent();
        break;
      case 'speakit':
        new SpeakitController(this.user, this.endGame).createEvent();
        break;
      case 'sprint':
        new SprintController(this.user, this.endGame).createEvent();
        break;
      default:
        break;
    }
  }

  createBegin(nameGame = 'Game', options = true) {
    this.begin = createElement('section', 'savannah__begin', 'begin');
    const wrap = createElement('div', 'savannah__options');
    if (options) {
      wrap.append(this.createLevels());
      wrap.append(this.createOptions());
      this.begin.append(wrap);
    }
    const title = createElement('h2', 'savannah__begin-title', false, nameGame);
    const start = createElement('button', 'savannah__begin-start', false, 'НАЧАТЬ');
    const exit = createElement('button', 'savannah__begin-start', false, 'Вернуться');
    this.begin.append(title);
    this.begin.append(start);
    this.begin.append(exit);
    exit.addEventListener('click', this.exitGame.bind(this));
    start.addEventListener('click', this.getStart.bind(this));
    return this.begin;
  }

  createEndGame() {
    const result = createElement('section', 'result', 'gameResult');
    const wrapIncorr = createElement('div', 'result__wrap');
    const incorrect = createElement('p', 'result__incorrect');
    const incorrectlyText = createElement('span', false, false, 'Incorrectly: ');
    const incorrectly = createElement('span', false, 'incorrectly');
    incorrect.append(incorrectlyText);
    incorrect.append(incorrectly);
    const invalidList = createElement('ul', 'result__list', 'invalidList');
    wrapIncorr.append(incorrect);
    wrapIncorr.append(invalidList);

    const wrapCorr = createElement('div', 'result__wrap');
    const correct = createElement('p', 'result__correct');
    const correctlyText = createElement('span', false, false, 'Correctly: ');
    const correctly = createElement('span', false, 'correctly');
    correct.append(correctlyText);
    correct.append(correctly);
    const validList = createElement('ul', 'result__list', 'validList');
    wrapCorr.append(correct);
    wrapCorr.append(validList);

    const buttons = createElement('div', 'result__buttons');
    const returnBtn = createElement('button', 'result__buttons-item', false, 'Выход');
    const newGameBtn = createElement('button', 'result__buttons-item', 'newGame', 'Нова игра');
    returnBtn.addEventListener('click', this.exitGame.bind(this));
    buttons.append(returnBtn);
    buttons.append(newGameBtn);
    result.append(wrapCorr);
    result.append(wrapIncorr);
    result.append(buttons);
    return result;
  }

  endGame(words) {
    this.count = 10;
    this.words = words;
    document.getElementById('gameResult').classList.add('show');

    const corrFragment = new DocumentFragment();
    const incorrFragment = new DocumentFragment();
    let incorrect = 0;
    for (let i = 0; i < this.count; i += 1) {
      const { word, transcription, wordTranslate } = words[i];
      const content = `${word} ${transcription} ${wordTranslate}`;
      const li = createElement('li', false, `li${i}`, content);
      if (words[i].correctly) {
        corrFragment.append(li);
      } else {
        incorrFragment.append(li);
        incorrect += 1;
      }
    }
    document.getElementById('correctly').innerHTML = this.count - incorrect;
    document.getElementById('incorrectly').innerHTML = incorrect;

    const invalidList = document.getElementById('invalidList');
    invalidList.innerHTML = '';
    invalidList.append(incorrFragment);
    const validList = document.getElementById('validList');
    validList.innerHTML = '';
    validList.append(corrFragment);
  }

  createLevels() {
    const wrap = createElement('div', 'levels', 'levels');
    for (let i = 0; i <= 6; i += 1) {
      const radio = createElement('label', 'radio', `radio${i}`);
      const span = createElement('span', 'radio__span', false, `lvl-${i}`);
      const input = createElement('input', 'radio__input', false, false);
      input.type = 'radio';
      input.name = 'group';
      input.setAttribute('data-value', i);
      if (i === 0) input.checked = 'checked';
      radio.append(input);
      radio.append(span);
      wrap.append(radio);
    }
    wrap.addEventListener('change', (e) => {
      if (e.target.value === 'on' && e.target.dataset) {
        this.level = +e.target.dataset.value;
      }
    });
    return wrap;
  }

  createOptions(minWords = 10, step = 5) {
    const wrap = createElement('div', 'savannah__select');
    const selectText = createElement('span', 'savannah__select-text', 'savSelectText', 'Количество слов');
    const select = document.createElement('select', 'savannah__select-options', 'selectCount');
    for (let i = 0; i < 3; i += 1) {
      const content = `${minWords + i * step}`;
      const option = document.createElement('option', 'savannah__select-options-item', false, content);
      select.append(option);
    }
    select.onchange = (e) => {
      this.count = e.target.value;
    };
    wrap.append(selectText);
    wrap.append(select);
    return wrap;
  }

  getStart() {
    this.begin.classList.add('hide');
  }

  exitGame() {
    this.begin = null;
    document.getElementById('header').classList.remove('hide');
    document.getElementById('footer').classList.remove('hide');
    document.getElementById('settings').classList.remove('hide');
    document.getElementById('navPage').click();
  }
}
