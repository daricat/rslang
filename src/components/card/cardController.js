import { urlGitHub } from '@/constants';
import CardView from './cardView';
import CardModel from './cardModel';

export default class CardController {
  constructor(user) {
    this.user = user;

    this.view = new CardView();
    this.model = new CardModel(this.user);
    this.params = {
      cardIndex: 0,
      passedToday: 0,
      numberNewWords: 0,
      consecutive: 0,
      newConsecutive: 0,
      newWordsToday: 0,
      correctAnswer: 0,
      incorrectAnswer: 0,
      wordsRepeatToday: 0,
      numberListPages: 0,
      generatedListToday: false,
      currentMistake: false,
      length: 0,
    };
    this.next = false;
    this.cut = false;
    this.removeWords = 0;
    this.unlock = true;
  }

  async create() {
    document.body.classList.add('show-main');
    document.body.classList.add('top-gear');
    this.settings = await this.user.getUserSettings();
    this.view.settings = this.settings.optional.settings;
    this.statistics = await this.user.getUserStatistics();
    this.params = this.statistics.optional.todayTraining.params;
    if (document.body.classList.contains('show-main')) {
      await this.getTodayStatStorage();
      this.view.renderHTML();
      if (this.model.listToday.length !== this.params.passedToday) {
        [this.params.cardIndex, this.params.passedToday, this.next] = this.view.setWordInCard({
          next: false,
          numberWords: this.model.listToday.length,
          passedTodaY: this.params.passedToday,
          word: this.model.listToday[this.params.cardIndex],
          cardIndeX: this.params.cardIndex,
        });
      } else {
        this.view.inputTodayStatistics(this.params);
      }
      await this.setTodayStatStorage();
      this.createEvent();
    }
  }

  async getTodayStatStorage() {
    let date = new Date();
    date = `${date.getDate()}${(date.getMonth() + 1)}${date.getFullYear()}`;
    this.checkCreateList = this.statistics.optional.todayTraining.lastDate === date;
    this.statistics.optional.todayTraining.lastDate = date;

    if (!this.checkCreateList) {
      Object.keys(this.params).forEach((key) => { this.params[key] = 0; });
      [
        this.params.generatedListToday,
        this.params.numberWordsForToday,
        this.params.numberListPages,
      ] = await this.model.createList({
        settings: this.view.settings,
        generatedListToday: this.params.generatedListToday,
        wordsRepeatToday: this.params.wordsRepeatToday,
        numberListPages: this.params.numberListPages,
      });
      await this.model.putListToday();
    } else {
      await this.model.getAllUserWords();
      await this.model.getListToday(this.params.numberListPages);
    }
  }

  async setTodayStatStorage() {
    const { cardIndex } = this.params;
    this.params.cardIndex = this.params.passedToday;
    this.params.length = (this.model.listToday) ? this.model.listToday.length : 0;
    await this.user.createUserStatistics({ learnedWords: 0, optional: this.statistics.optional });
    this.params.cardIndex = cardIndex;
  }

  createEvent() {
    document.getElementById('addition').addEventListener('click', this.eventAddition.bind(this));
    this.view.leftArrow.addEventListener('click', this.moveToLeft.bind(this));
    this.view.cardPlay.addEventListener('click', this.playWord.bind(this, true));
    this.view.input.addEventListener('input', this.inputSymbols.bind(this));
    document.body.addEventListener('keydown', (e) => { if (e.code === 'Enter') this.eventRight(); });
    this.view.rightArrow.addEventListener('click', this.eventRight.bind(this));
    this.view.cardRemove.addEventListener('click', this.eventRemove.bind(this));
    this.view.cardDiff.addEventListener('click', this.eventBookmark.bind(this));
    this.view.cardAgain.addEventListener('click', this.eventCardAgain.bind(this));
    this.view.cardCorrect.addEventListener('click', () => this.view.input.focus());
    this.view.cardShow.addEventListener('click', this.showCard.bind(this));
    this.view.cardHard.addEventListener('click', this.setInterval.bind(this, 'cardHard', 0));
    this.view.cardNormal.addEventListener('click', this.setInterval.bind(this, 'cardNormal', 1));
    this.view.cardEasy.addEventListener('click', this.setInterval.bind(this, 'cardEasy', 2));
    document.getElementById('settings').addEventListener('change', this.setSettings.bind(this));
    const idChecks = ['translate', 'meaningWord', 'exampleWord'];
    idChecks.forEach((item) => {
      document.getElementById(item).addEventListener('click', () => {
        if (idChecks.filter((el) => document.getElementById(el).checked).length < 1) {
          document.getElementById(item).checked = true;
        }
      });
    });
  }

  async eventRight() {
    if (this.view.rightArrow.classList.contains('lock-arrow')) return;
    this.view.lockElements(true);
    const setNextWord = this.params.cardIndex + 1 === (this.params.passedToday + Number(this.next));
    if (this.view.rightArrow.classList.contains('go-next') && setNextWord) {
      this.view.clearCard();
      if (this.params.passedToday === this.model.listToday.length) {
        this.params.generatedListToday = false;
        this.view.inputTodayStatistics(this.params);
        this.model.clearListToday();
      } else {
        let nextWord = Number(!this.cut);
        this.cut = false;
        if (this.params.cardIndex === this.model.listToday.length - 1) nextWord = 0;
        [this.params.cardIndex, this.params.passedToday, this.next] = this.view.setWordInCard({
          next: true,
          numberWords: this.model.listToday.length,
          passedTodaY: this.params.passedToday,
          word: this.model.listToday[this.params.cardIndex + nextWord],
          cardIndeX: this.params.cardIndex,
        });
      }
    } else if (this.params.cardIndex === this.params.passedToday) {
      await this.setAnswerInCard(false);
    } else {
      await this.setAnswerInCard('right');
    }
    if (this.unlock) this.view.lockElements(false);
  }

  async eventRemove() {
    if (!this.view.isLock() && this.model.listToday.length > 0) {
      this.view.lockElements(true);
      const removeWord = this.model.listToday[this.params.cardIndex];
      let state = 'remove';
      if (removeWord.state === state) state = 'study';

      let isNew = false;
      if (this.model.allStudyWords.find((item) => item.word === removeWord.word)) {
        if (!removeWord.isPassed) isNew = true;
        await this.model.updateAllStudyWords({ word: removeWord, isUpdate: true, state });
      } else {
        isNew = true;
        await this.model.updateAllStudyWords({ word: removeWord, isNew: true, state });
      }
      if (isNew) {
        this.removeWord();
      } else {
        this.view.setInDictionary(state, this.currentMistake);
      }
      await this.setTodayStatStorage();
      await this.model.putListToday();
      this.view.lockElements(false);
    }
  }

  removeWord() {
    this.params.currentMistake = false;
    this.model.listToday.splice(this.params.cardIndex, 1);
    if (this.params.passedToday === this.model.listToday.length) {
      this.params.generatedListToday = false;
      this.view.inputTodayStatistics(this.params);
      this.model.clearListToday();
    } else {
      this.view.setWordInCard({
        next: false,
        numberWords: this.model.listToday.length,
        passedTodaY: this.params.passedToday,
        word: this.model.listToday[this.params.passedToday],
        cardIndeX: this.params.passedToday,
      });
    }
  }

  async eventBookmark() {
    if (this.unlock) this.view.lockElements(true);
    const lastWord = this.model.listToday[this.model.listToday.length - 1];
    const word = (this.cut) ? lastWord : this.model.listToday[this.params.cardIndex];

    let state = 'difficult';
    if (word.state === state) state = 'study';

    this.view.setInDictionary(state, this.currentMistake);
    const { customRating } = word;
    const compare = word.word.toLowerCase();
    if (this.model.allStudyWords.find((item) => item.word.toLowerCase() === compare)) {
      await this.model.updateAllStudyWords({
        word, isUpdate: true, customRating, state,
      });
    } else {
      await this.model.updateAllStudyWords({
        word, isNew: true, customRating, state,
      });
    }
    await this.model.putListToday();
    if (this.unlock) this.view.lockElements(false);
  }

  async eventCardAgain() {
    if (!this.view.cardAgain.classList.contains('lock-element')) {
      if (this.unlock) this.view.lockElements(true);
      this.view.cardAgain.classList.add('lock-element');
      const cutWord = this.model.listToday.splice(this.params.cardIndex, 1)[0];
      cutWord.isPassed = false;
      cutWord.timeToday = new Date().getTime();
      this.model.listToday.push(cutWord);
      this.params.passedToday -= 1;
      this.next = true;
      this.view.again = true;
      this.cut = true;
      this.view.changeRange(false, this.params.passedToday, this.model.listToday.length);
      await this.setTodayStatStorage();
      await this.model.putListToday();
      if (this.unlock) this.view.lockElements(false);
    }
  }

  async setAnswerInCard(prev, show) {
    this.checkDirection(prev);

    const answer = this.view.input.value.toLowerCase();
    const word = this.model.listToday[this.params.cardIndex];
    let showAnswer;
    if (this.view.settings.langEn) {
      word.word = word.word.toLowerCase();
      showAnswer = (answer === word.word);
    } else {
      word.wordTranslate = word.wordTranslate.toLowerCase();
      showAnswer = (answer === word.wordTranslate);
    }

    let isNotNew;
    if (this.view.settings.langEn) {
      isNotNew = this.model.allStudyWords.find((item) => item.word === word.word);
    } else {
      isNotNew = this.model.allStudyWords.find((item) => item.wordTranslate === word.wordTranslate);
    }

    if (showAnswer || prev) {
      await this.showAnswer({
        word, prev, showAnswer, show, isNotNew,
      });
    } else {
      await this.mistakeAnswer({
        word, answer, prev, isNotNew,
      });
    }
  }

  checkDirection(prev) {
    if (prev === 'left') {
      this.params.cardIndex -= 1;
      [this.params.cardIndex, this.params.passedToday, this.next] = this.view.setWordInCard({
        next: false,
        numberWords: this.model.listToday.length,
        passedTodaY: this.params.passedToday,
        word: this.model.listToday[this.params.cardIndex],
        cardIndeX: this.params.cardIndex,
        notPrev: false,
      });
    } else if (prev === 'right') {
      this.view.cardAgain.classList.remove('lock-element');
      if (!this.view.again) this.params.cardIndex += 1;
      this.view.again = false;
      this.cut = false;
      [this.params.cardIndex, this.params.passedToday, this.next] = this.view.setWordInCard({
        next: false,
        numberWords: this.model.listToday.length,
        passedTodaY: this.params.passedToday,
        word: this.model.listToday[this.params.cardIndex],
        cardIndeX: this.params.cardIndex,
        notPrev: false,
      });
    }
  }

  async showAnswer({
    word, prev, showAnswer, show, isNotNew,
  }) {
    await this.view.setAnswerInCard(word, this.params.currentMistake, prev);
    if (showAnswer) {
      if (this.view.settings.sound) {
        this.playWord();
      } else if (this.view.settings.nextCard) {
        this.unlock = false;
      }
      word.timeToday = new Date().getTime();
      const { customRating } = this.model.listToday[this.params.cardIndex];
      this.view.blockButtons(customRating);
      this.params.newConsecutive += 1;
      this.params.correctAnswer += 1;
      if (this.params.newConsecutive > this.params.consecutive) {
        this.params.consecutive = this.params.newConsecutive;
      }
      await this.updateWord({
        word, prev, show, isNotNew,
      });
      await this.checkMistakeFactor(word, show);
      if (!this.view.settings.sound) this.moveNexCard();
      if (!prev) await this.setTodayStatStorage();
    }
  }

  async updateWord({
    word, prev, show, isNotNew,
  }) {
    const mistake = show || false;
    if (isNotNew && !prev) {
      await this.model.updateAllStudyWords({
        word, isUpdate: true, isCount: true, mistake,
      });
    } else if (!prev) {
      this.params.newWordsToday += 1;
      this.addChartStatistics();
      await this.model.updateAllStudyWords({
        word, isNew: true, isCount: true, mistake, customRating: false, state: 'study',
      });
    }
  }

  async checkMistakeFactor(word, show) {
    if (!this.params.currentMistake) {
      word.isPassed = true;
      this.params.passedToday = this.view.changeRange(
        true, this.params.passedToday, this.model.listToday.length,
      );
    } else if (this.model.listToday.length !== this.params.cardIndex + 1) {
      const cutWord = this.model.listToday.splice(this.params.cardIndex, 1)[0];
      this.model.listToday.push(cutWord);
      this.cut = true;
    }

    if (!show) {
      if (this.params.currentMistake) {
        await this.model.putListToday();
        this.next = true;
        this.view.next = true;
      } else {
        await this.model.putListToday();
      }
    }
    this.params.currentMistake = false;
  }

  async mistakeAnswer({
    word, answer, prev, isNotNew,
  }) {
    this.params.currentMistake = true;
    this.params.newConsecutive = 0;
    this.params.incorrectAnswer += 1;
    this.view.cardCorrect.classList.remove('opacity-correct');
    if (isNotNew && !prev) {
      await this.model.updateAllStudyWords({
        word, isUpdate: true, isCount: true, mistake: true,
      });
    } else {
      this.params.newWordsToday += 1;
      this.addChartStatistics();
      await this.model.updateAllStudyWords({
        word, isNew: true, isCount: true, mistake: true, state: 'study',
      });
    }

    if (this.view.settings.langEn) {
      this.view.incorrectWord(answer, word.word);
    } else {
      this.view.incorrectWord(answer, word.wordTranslate);
    }
    await this.setTodayStatStorage();
    await this.model.putListToday();
  }

  playWord(isClick) {
    if (!isClick) {
      this.unlock = false;
      this.view.lockElements(false);
      this.view.lockArrows(true);
    }
    const lastWord = this.model.listToday[this.model.listToday.length - 1];
    const currentWord = this.model.listToday[this.params.cardIndex];
    const word = (this.cut) ? lastWord : currentWord;
    const playWord = new Audio();
    playWord.src = `${urlGitHub}${word.audio.replace('files/', '')}`;
    const playMeaning = new Audio();
    playMeaning.src = `${urlGitHub}${word.audioMeaning.replace('files/', '')}`;
    const playExample = new Audio();
    playExample.src = `${urlGitHub}${word.audioExample.replace('files/', '')}`;
    playWord.play();
    playWord.onended = () => {
      if (this.view.settings.meaningWord) {
        playMeaning.play();
      } else if (this.view.settings.exampleWord) {
        playExample.play();
      } else this.moveNexCard();
    };
    playMeaning.onended = () => {
      if (this.view.settings.exampleWord) {
        playExample.play();
      } else this.moveNexCard();
    };
    playExample.onended = () => this.moveNexCard();
  }

  moveNexCard() {
    if (this.view.settings.nextCard) {
      this.view.lockElements();
      this.unlock = true;
      this.eventRight(true);
    }
  }

  async eventAddition() {
    this.view.nextCard();
    this.view.clearCard();
    Object.keys(this.params).forEach((key) => { this.params[key] = 0; });
    this.model.clearListToday();
    [
      this.params.generatedListToday,
      this.params.numberWordsForToday,
      this.params.numberListPages,
    ] = await this.model.createList({
      settings: this.view.settings,
      generatedListToday: false,
      wordsRepeatToday: this.params.wordsRepeatToday,
      numberListPages: this.numberListPages,
    });
    const len = this.model.listToday.length;
    this.view.setWordInCard({
      next: false, numberWords: len, passedTodaY: 0, word: this.model.listToday[0], cardIndeX: 0,
    });
    await this.setTodayStatStorage();
    await this.model.putListToday();
  }

  async moveToLeft() {
    if (this.params.cardIndex > 0 && !this.view.leftArrow.classList.contains('lock-arrow')) {
      this.cut = false;
      await this.setAnswerInCard('left');
      const word = this.model.listToday[this.params.cardIndex];
      this.view.moveToLeft(word.state);
    }
  }

  inputSymbols() {
    if (this.view.input.value !== '') {
      this.view.cardCorrect.innerHTML = '';
      this.view.cardCorrect.classList.remove('opacity-correct');
    } else {
      const word = this.model.listToday[this.params.cardIndex];
      if (this.view.settings.langEn) {
        this.view.input.setAttribute('maxlength', word.word.length);
        this.view.incorrectWord('', '*'.repeat(word.word.length));
      } else {
        this.view.input.setAttribute('maxlength', word.wordTranslate.length);
        this.view.incorrectWord('', '*'.repeat(word.wordTranslate.length));
      }
    }
  }

  async showCard() {
    const word = this.model.listToday[this.params.cardIndex];
    if (this.view.isShow(word)) {
      this.view.lockElements(true);
      this.params.currentMistake = true;
      await this.setAnswerInCard(false, true);
      if (this.params.newConsecutive === this.params.consecutive) this.params.consecutive -= 1;
      word.isPassed = false;
      this.params.newConsecutive -= 1;
      this.params.correctAnswer -= 1;
      this.params.newConsecutive = 0;
      this.params.incorrectAnswer += 1;
      this.next = true;
      this.view.again = true;
      await this.setTodayStatStorage();
      await this.model.putListToday();
      if (!this.view.settings.nextCard) {
        this.view.lockElements(false);
      }
    }
  }

  async setInterval(elem, coef) {
    if (!this.view[elem].classList.contains('lock-element')) {
      if (this.unlock) this.view.lockElements(true);
      let word;
      if (this.cut) {
        word = this.model.listToday[this.model.listToday.length - 1];
      } else {
        word = this.model.listToday[this.params.cardIndex];
      }
      const INTERVAL_FACTOR = (coef * 2) + 1;
      if (word.customRating !== INTERVAL_FACTOR) {
        this.view.setCustomRating(INTERVAL_FACTOR);
        await this.model.updateAllStudyWords({
          word, isUpdate: true, customRating: INTERVAL_FACTOR,
        });
      } else {
        this.view.setCustomRating('clear');
        await this.model.updateAllStudyWords({ word, isUpdate: true, customRating: 'clear' });
      }
      await this.model.putListToday();
      if (this.unlock) this.view.lockElements(false);
    }
  }

  async setSettings(e) {
    if (e.target.tagName === 'INPUT') {
      if (this.view.getSettings()) {
        [
          this.params.generatedListToday,
          this.params.numberWordsForToday,
          this.params.numberListPages,
        ] = await this.model.createList({
          settings: this.view.settings,
          generatedListToday: false,
          wordsRepeatToday: this.params.wordsRepeatToday,
          numberListPages: this.numberListPages,
        });
        this.params.passedToday = 0;
        this.params.cardIndex = 0;
        this.params.consecutive = 0;
        this.params.newConsecutive = 0;
        this.params.newWordsToday = 0;
        this.currentMistake = false;
        this.params.correctAnswer = 0;
        this.view.clearCard();
        const len = this.model.listToday.length;
        const word = (this.cut) ? this.model.listToday[len - 1] : this.model.listToday[+0];
        this.view.setWordInCard({
          next: false, numberWords: len, passedTodaY: 0, word, cardIndeX: 0,
        });
        await this.setTodayStatStorage();
        await this.model.putListToday();
      }

      const len = this.model.listToday.length;
      const index = this.params.cardIndex;
      const word = (this.cut) ? this.model.listToday[len - 1] : this.model.listToday[index];

      this.settings.optional.settings = this.view.settings;
      await this.user.createUserSettings({ learnedWords: 0, optional: this.settings.optional });
      this.view.setSettingsInCard({
        word, cardIndex: index, passedToday: this.params.passedToday, change: true,
      });
    }
  }

  addChartStatistics() {
    const days = this.statistics.optional.statisticsChart;
    let today = new Date();
    let day = today.getDate();
    let month = today.getMonth() + 1;
    if (day < 10) day = `0${day}`;
    if (month < 10) month = `0${month}`;
    today = `${day}-${month}-${today.getFullYear()}`;
    const find = Object.keys(days).find((item) => item === today);
    if (find) {
      days[today] = +days[today] + 1;
    } else {
      days[today] = 1;
      days.length = +days.length + 1;
    }
  }
}
