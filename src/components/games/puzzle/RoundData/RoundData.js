export default class RoundData {
  constructor(level, roundNumber, obtainWords) {
    this.level = level;
    this.roundNumber = roundNumber;
    this.obtainWords = obtainWords;
    this.rawData = null;
    this.roundImgData = null;
    this.roundImg = null;
    this.cutRoundImg = null;
  }

  async makeSentences() {
    this.rawData = await this.obtainWords(this.level, this.roundNumber);
    this.sentences = Object.values(this.rawData).map((el) => {
      const currentSentence = {};
      currentSentence.img = `https://raw.githubusercontent.com/timurkalimullin/rslang-data/master/${el.image}`;
      currentSentence.audio = `https://raw.githubusercontent.com/timurkalimullin/rslang-data/master/${el.audioExample}`;
      currentSentence.word = el.word;
      currentSentence.wordTranslate = el.wordTranslate;
      currentSentence.textExampleTranslate = el.textExampleTranslate;
      currentSentence.textExample = el.textExample;
      return currentSentence;
    });
  }

  async getRoundImg() {
    const urlPaintings = 'https://raw.githubusercontent.com/timurkalimullin/rslang_data_paintings/master/';
    const modRoundNumber = this.roundNumber < 10 ? `0${this.roundNumber}` : this.roundNumber;

    const response = await fetch(`${urlPaintings}paintings.json`);
    const paintings = await response.json();

    paintings.forEach((el) => {
      if (el.id === `${parseInt(this.level, 0) + 1}_${modRoundNumber}`) {
        this.roundImgData = el;
      }
    });

    this.roundImg = `${urlPaintings}${this.roundImgData.imageSrc}`;
    this.cutRoundImg = `${urlPaintings}${this.roundImgData.cutSrc}`;
  }

  async formSentenceData() {
    await this.makeSentences();
    await this.getRoundImg();
  }
}
