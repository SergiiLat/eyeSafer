import sveltePreprocess from 'svelte-preprocess'

export default {
  preprocess: sveltePreprocess({
    typescript: {
      tsconfigFile: './tsconfig.web.json'
    }
  })
}
