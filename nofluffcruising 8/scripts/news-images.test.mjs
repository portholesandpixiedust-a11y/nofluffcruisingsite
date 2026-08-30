import { pickUsable, stripTags, subjectFor } from './news-images.mjs';

let fails = 0;
const check = (n, c) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${n}`); if (!c) fails++; };

const page = (licence, extra = {}) => ({
  title: 'File:Ship.jpg',
  imageinfo: [{
    mime: 'image/jpeg', width: 2000, thumburl: 'https://upload.wikimedia.org/x.jpg',
    descriptionurl: 'https://commons.wikimedia.org/wiki/File:Ship.jpg',
    extmetadata: {
      LicenseShortName: { value: licence },
      Artist: { value: '<a href="/wiki/User:Someone">A Photographer</a>' },
      LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0/' },
    },
    ...extra,
  }],
});

check('CC BY-SA accepted',        !!pickUsable([page('CC BY-SA 4.0')]));
check('CC BY accepted',           !!pickUsable([page('CC BY 3.0')]));
check('CC0 accepted',             !!pickUsable([page('CC0')]));
check('Public domain accepted',   !!pickUsable([page('Public domain')]));
check('CC BY-NC rejected',        pickUsable([page('CC BY-NC 4.0')]) === null);
check('CC BY-ND rejected',        pickUsable([page('CC BY-ND 4.0')]) === null);
check('fair use rejected',        pickUsable([page('Fair use')]) === null);
check('all-rights-reserved rejected', pickUsable([page('Copyrighted, all rights reserved')]) === null);
check('no licence rejected',      pickUsable([page('')]) === null);
check('small image rejected',     pickUsable([page('CC BY-SA 4.0', { width: 400 })]) === null);
check('non-image rejected',       pickUsable([page('CC BY-SA 4.0', { mime: 'application/pdf' })]) === null);
check('picks first usable of several', pickUsable([page('CC BY-NC 4.0'), page('CC BY-SA 4.0')])?.licence === 'CC BY-SA 4.0');
check('artist html stripped',     pickUsable([page('CC BY-SA 4.0')]).artist === 'A Photographer');
check('stripTags handles entities', stripTags('<a href="#">Bob &amp; Co</a>') === 'Bob & Co');

const s = await subjectFor({ title: 'Typhoon Saudel delays Spectrum of the Seas', line: 'Royal Caribbean' }, '');
check('subject picked from title', s === 'Spectrum of the Seas');
const s2 = await subjectFor({ title: 'Icon of the Seas moves to Galveston', line: 'Royal Caribbean' }, '');
check('subject matches ship database', s2 === 'Icon of the Seas');
const s3 = await subjectFor({ title: 'A story with no ship in it', line: 'Carnival' }, '');
check('falls back to the line', s3 === 'Carnival cruise');

console.log(fails ? `\n${fails} failing` : '\nall green');
process.exit(fails ? 1 : 0);
