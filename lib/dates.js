function asUtcDate(value) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error("無法解析日期");
    }
    return value;
  }

  if (typeof value === "string") {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (match) {
      return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    }
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`無法解析日期：${value}`);
  }
  return date;
}

function formatIso(value) {
  const date = asUtcDate(value);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplay(value) {
  const date = asUtcDate(value);
  return `${date.getUTCFullYear()}年${date.getUTCMonth() + 1}月${date.getUTCDate()}日`;
}

function formatRss(value) {
  return asUtcDate(value).toUTCString();
}

module.exports = {
  asUtcDate,
  formatIso,
  formatDisplay,
  formatRss,
};
