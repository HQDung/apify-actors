const clean = (value) => String(value ?? '').replace(/[\s-]/g, '').toUpperCase();

const validIsbn10 = (value) => {
    if (!/^[0-9]{9}[0-9X]$/.test(value)) return false;
    const sum = [...value].reduce(
        (total, character, index) => total + (character === 'X' ? 10 : Number(character)) * (10 - index),
        0,
    );
    return sum % 11 === 0;
};

const validIsbn13 = (value) => {
    if (!/^\d{13}$/.test(value)) return false;
    const sum = [...value.slice(0, 12)].reduce(
        (total, character, index) => total + Number(character) * (index % 2 === 0 ? 1 : 3),
        0,
    );
    return (10 - (sum % 10)) % 10 === Number(value[12]);
};

const isbn10To13 = (value) => {
    const body = `978${value.slice(0, 9)}`;
    const sum = [...body].reduce(
        (total, character, index) => total + Number(character) * (index % 2 === 0 ? 1 : 3),
        0,
    );
    return `${body}${(10 - (sum % 10)) % 10}`;
};

const isbn13To10 = (value) => {
    if (!value.startsWith('978')) return null;
    const body = value.slice(3, 12);
    const sum = [...body].reduce((total, character, index) => total + Number(character) * (10 - index), 0);
    const check = (11 - (sum % 11)) % 11;
    return `${body}${check === 10 ? 'X' : check}`;
};

export const parseIsbn = (value) => {
    const normalized = clean(value);
    if (validIsbn10(normalized)) {
        return { isbn10: normalized, isbn13: isbn10To13(normalized) };
    }
    if (validIsbn13(normalized)) {
        return { isbn10: isbn13To10(normalized), isbn13: normalized };
    }
    return null;
};

export const isValidIsbn = (value) => Boolean(parseIsbn(value));
