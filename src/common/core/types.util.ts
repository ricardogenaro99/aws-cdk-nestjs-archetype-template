export const TYPES = {
  isEmpty(...valores: any[]) {
    for (let i = 0; i < valores.length; i++) {
      const valor = valores[i];
      if (
        [null, undefined, 'undefined', 'null', '', 0, false, 'false', []].includes(valor) ||
        (Array.isArray(valor) && valor.length === 0) ||
        (valor && valor.constructor === Object && Object.entries(valor).length === 0)
      ) {
        return true;
      }
    }
    return false;
  },
};
