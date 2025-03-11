function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export function beautifyUriElement(element: string): string {
  return element
    .split("/")
    .map((part) => part.split(/[_-]/).map(capitalize).join(" "))
    .join(" | ");
}
