/* Reguły przypisania liter. Edytor opisów nie zmienia tego pliku. */
const freeze=x=>{if(x&&typeof x==="object"){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
export const METHOD_CONFIG=freeze({
  "profileVersion": "profil-urodzenia-1.0",
  "tikkunVariant": "expanded",
  "letters": {
    "Prawa": {
      "1": {
        "name": "Alef",
        "symbol": "א"
      },
      "2": {
        "name": "Bet",
        "symbol": "ב"
      },
      "3": {
        "name": "Gimel",
        "symbol": "ג"
      },
      "4": {
        "name": "Dalet",
        "symbol": "ד"
      },
      "5": {
        "name": "He",
        "symbol": "ה"
      },
      "6": {
        "name": "Waw",
        "symbol": "ו"
      },
      "7": {
        "name": "Zajin",
        "symbol": "ז"
      },
      "8": {
        "name": "Chet",
        "symbol": "ח"
      },
      "9": {
        "name": "Tet",
        "symbol": "ט"
      },
      "10": {
        "name": "Jod",
        "symbol": "י"
      },
      "11": {
        "name": "Chaf",
        "symbol": "כ"
      },
      "12": {
        "name": "Lamed",
        "symbol": "ל"
      },
      "13": {
        "name": "Mem",
        "symbol": "מ"
      },
      "14": {
        "name": "Nun",
        "symbol": "נ"
      },
      "15": {
        "name": "Samech",
        "symbol": "ס"
      },
      "16": {
        "name": "Ajin",
        "symbol": "ע"
      },
      "17": {
        "name": "Pe",
        "symbol": "פ"
      },
      "18": {
        "name": "Cadi",
        "symbol": "צ"
      },
      "19": {
        "name": "Kof",
        "symbol": "ק"
      },
      "20": {
        "name": "Resz",
        "symbol": "ר"
      },
      "21": {
        "name": "Taw",
        "symbol": "ת"
      },
      "22": {
        "name": "Mente",
        "symbol": "תּ"
      }
    },
    "Lewa": {
      "1": {
        "name": "Alef",
        "symbol": "א"
      },
      "2": {
        "name": "Bet",
        "symbol": "ב"
      },
      "3": {
        "name": "Gimel",
        "symbol": "ג"
      },
      "4": {
        "name": "Dalet",
        "symbol": "ד"
      },
      "5": {
        "name": "He",
        "symbol": "ה"
      },
      "6": {
        "name": "Waw",
        "symbol": "ו"
      },
      "7": {
        "name": "Zajin",
        "symbol": "ז"
      },
      "8": {
        "name": "Chet",
        "symbol": "ח"
      },
      "9": {
        "name": "Tet",
        "symbol": "ט"
      },
      "10": {
        "name": "Jod",
        "symbol": "י"
      },
      "11": {
        "name": "Chaf",
        "symbol": "כ"
      },
      "12": {
        "name": "Lamed",
        "symbol": "ל"
      },
      "13": {
        "name": "Mem",
        "symbol": "מ"
      },
      "14": {
        "name": "Nun",
        "symbol": "נ"
      },
      "15": {
        "name": "Samech",
        "symbol": "ס"
      },
      "16": {
        "name": "Ajin",
        "symbol": "ע"
      },
      "17": {
        "name": "Pe",
        "symbol": "פ"
      },
      "18": {
        "name": "Cadi",
        "symbol": "צ"
      },
      "19": {
        "name": "Kof",
        "symbol": "ק"
      },
      "20": {
        "name": "Resz",
        "symbol": "ר"
      },
      "21": {
        "name": "Taw",
        "symbol": "ת"
      },
      "22": {
        "name": "Mente",
        "symbol": "תּ"
      }
    },
    "Gleboka": {
      "1": {
        "name": "Alef",
        "symbol": "א"
      },
      "2": {
        "name": "Bet",
        "symbol": "ב"
      },
      "3": {
        "name": "Gimel",
        "symbol": "ג"
      },
      "4": {
        "name": "Dalet",
        "symbol": "ד"
      },
      "5": {
        "name": "He",
        "symbol": "ה"
      },
      "6": {
        "name": "Waw",
        "symbol": "ו"
      },
      "7": {
        "name": "Zajin",
        "symbol": "ז"
      },
      "8": {
        "name": "Chet",
        "symbol": "ח"
      },
      "9": {
        "name": "Tet",
        "symbol": "ט"
      },
      "10": {
        "name": "Jod",
        "symbol": "י"
      },
      "11": {
        "name": "Chaf",
        "symbol": "כ"
      },
      "12": {
        "name": "Lamed",
        "symbol": "ל"
      },
      "13": {
        "name": "Mem",
        "symbol": "מ"
      },
      "14": {
        "name": "Nun",
        "symbol": "נ"
      },
      "15": {
        "name": "Samech",
        "symbol": "ס"
      },
      "16": {
        "name": "Ajin",
        "symbol": "ע"
      },
      "17": {
        "name": "Pe",
        "symbol": "פ"
      },
      "18": {
        "name": "Cadi",
        "symbol": "צ"
      },
      "19": {
        "name": "Kof",
        "symbol": "ק"
      },
      "20": {
        "name": "Resz",
        "symbol": "ר"
      },
      "21": {
        "name": "Taw",
        "symbol": "ת"
      },
      "22": {
        "name": "Mente",
        "symbol": "תּ"
      }
    },
    "Talent": {
      "1": {
        "name": "Alef",
        "symbol": "א"
      },
      "2": {
        "name": "Bet",
        "symbol": "ב"
      },
      "3": {
        "name": "Gimel",
        "symbol": "ג"
      },
      "4": {
        "name": "Dalet",
        "symbol": "ד"
      },
      "5": {
        "name": "He",
        "symbol": "ה"
      },
      "6": {
        "name": "Waw",
        "symbol": "ו"
      },
      "7": {
        "name": "Zajin",
        "symbol": "ז"
      },
      "8": {
        "name": "Chet",
        "symbol": "ח"
      },
      "9": {
        "name": "Tet",
        "symbol": "ט"
      },
      "10": {
        "name": "Jod",
        "symbol": "י"
      },
      "11": {
        "name": "Chaf",
        "symbol": "כ"
      },
      "12": {
        "name": "Lamed",
        "symbol": "ל"
      },
      "13": {
        "name": "Mem",
        "symbol": "מ"
      },
      "14": {
        "name": "Nun",
        "symbol": "נ"
      },
      "15": {
        "name": "Samech",
        "symbol": "ס"
      },
      "16": {
        "name": "Ajin",
        "symbol": "ע"
      },
      "17": {
        "name": "Pe",
        "symbol": "פ"
      },
      "18": {
        "name": "Cadi",
        "symbol": "צ"
      },
      "19": {
        "name": "Kof",
        "symbol": "ק"
      },
      "20": {
        "name": "Resz",
        "symbol": "ר"
      },
      "21": {
        "name": "Taw",
        "symbol": "ת"
      },
      "22": {
        "name": "Mente",
        "symbol": "תּ"
      }
    },
    "Wezel": {
      "1": {
        "name": "Alef",
        "symbol": "א"
      },
      "2": {
        "name": "Bet",
        "symbol": "ב"
      },
      "3": {
        "name": "Gimel",
        "symbol": "ג"
      },
      "4": {
        "name": "Dalet",
        "symbol": "ד"
      },
      "5": {
        "name": "He",
        "symbol": "ה"
      },
      "6": {
        "name": "Waw",
        "symbol": "ו"
      },
      "7": {
        "name": "Zajin",
        "symbol": "ז"
      },
      "8": {
        "name": "Chet",
        "symbol": "ח"
      },
      "9": {
        "name": "Tet",
        "symbol": "ט"
      },
      "10": {
        "name": "Jod",
        "symbol": "י"
      },
      "11": {
        "name": "Chaf",
        "symbol": "כ"
      },
      "12": {
        "name": "Lamed",
        "symbol": "ל"
      },
      "13": {
        "name": "Mem",
        "symbol": "מ"
      },
      "14": {
        "name": "Nun",
        "symbol": "נ"
      },
      "15": {
        "name": "Samech",
        "symbol": "ס"
      },
      "16": {
        "name": "Ajin",
        "symbol": "ע"
      },
      "17": {
        "name": "Pe",
        "symbol": "פ"
      },
      "18": {
        "name": "Cadi",
        "symbol": "צ"
      },
      "19": {
        "name": "Kof",
        "symbol": "ק"
      },
      "20": {
        "name": "Resz",
        "symbol": "ר"
      },
      "21": {
        "name": "Taw",
        "symbol": "ת"
      },
      "22": {
        "name": "Mente",
        "symbol": "תּ"
      }
    },
    "Tikkun": {
      "1": {
        "name": "Alef",
        "symbol": "א"
      },
      "2": {
        "name": "Bet",
        "symbol": "ב"
      },
      "3": {
        "name": "Gimel",
        "symbol": "ג"
      },
      "4": {
        "name": "Dalet",
        "symbol": "ד"
      },
      "5": {
        "name": "He",
        "symbol": "ה"
      },
      "6": {
        "name": "Waw",
        "symbol": "ו"
      },
      "7": {
        "name": "Zajin",
        "symbol": "ז"
      },
      "8": {
        "name": "Chet",
        "symbol": "ח"
      },
      "9": {
        "name": "Tet",
        "symbol": "ט"
      },
      "10": {
        "name": "Jod",
        "symbol": "י"
      },
      "11": {
        "name": "Chaf",
        "symbol": "כ"
      },
      "12": {
        "name": "Lamed",
        "symbol": "ל"
      },
      "13": {
        "name": "Mem",
        "symbol": "מ"
      },
      "14": {
        "name": "Nun",
        "symbol": "נ"
      },
      "15": {
        "name": "Samech",
        "symbol": "ס"
      },
      "16": {
        "name": "Ajin",
        "symbol": "ע"
      },
      "17": {
        "name": "Pe",
        "symbol": "פ"
      },
      "18": {
        "name": "Kof",
        "symbol": "ק"
      },
      "19": {
        "name": "Resz",
        "symbol": "ר"
      },
      "20": {
        "name": "Szin",
        "symbol": "ש"
      },
      "21": {
        "name": "Taw",
        "symbol": "ת"
      },
      "22": {
        "name": "Mente",
        "symbol": "∞"
      }
    }
  }
});
