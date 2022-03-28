const { src, dest, parallel, series, watch } = require("gulp");

const del = require("del");
const browserSync = require("browser-sync");

const loadPlugin = require("gulp-load-plugins");

const plugins = loadPlugin();
const bs = browserSync.create();
const sass = require("gulp-sass")(require("sass"));

const cwd = process.cwd();

let config = {
  // default config
  build: {
    src: "src",
    dist: "dist",
    temp: "temp",
    public: "public",
    paths: {
      styles: "assets/style/*.scss",
      scripts: "assets/scripts/*.js",
      page: "*.html",
      images: "assets/images/**",
      fonts: "assets/fonts/**",
    },
  },
};

console.log('cwd:', cwd)

try {
  const loadConfig = require(`${cwd}/page.config.js`);
  config = Object.assign({}, config, loadConfig);
} catch (e) {
  console.log("e:", e);
  config = Object.assign({}, config);
}

const clean = () => {
  return del([config.build.dist, config.build.temp]);
};

const style = () => {
  return src(config.build.paths.styles, {
    base: config.build.src,
    cwd: config.build.src,
  })
    .pipe(sass({ outputStyle: "expanded" }))
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true }));
};

const script = () => {
  return src(config.build.paths.scripts, {
    base: config.build.src,
    cwd: config.build.src,
  })
    .pipe(plugins.babel({ presets: [require("@babel/preset-env")] }))
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true }));
};

const page = () => {
  return src(config.build.paths.page, {
    base: config.build.src,
    cwd: config.build.src,
  })
    .pipe(plugins.swig({ data: config.data, defaults: { cache: false } })) // 防止模板缓存导致页面不能及时更新
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true }));
};

const image = () => {
  return src(config.build.paths.images, {
    base: config.build.src,
    cwd: config.build.src,
  })
    .pipe(plugins.imagemin())
    .pipe(dest(config.build.dist));
};

const font = () => {
  return src(config.build.paths.fonts, {
    base: config.build.src,
    cwd: config.build.src,
  })
    .pipe(plugins.imagemin())
    .pipe(dest(config.build.dist));
};

const extra = () => {
  return src("**", {
    base: config.build.public,
    cwd: config.build.public,
  }).pipe(dest(config.build.dist));
};

const serve = () => {
  watch(config.build.paths.styles, { cwd: config.build.src }, style);
  watch(config.build.paths.scripts, { cwd: config.build.src }, script);
  watch(config.build.paths.page, { cwd: config.build.src }, page);

  watch(
    [config.build.paths.images, config.build.paths.fonts],
    { cwd: config.build.src },
    bs.reload
  );

  watch("**", { cwd: config.build.public }, bs.reload);

  bs.init({
    notify: false,
    port: 8888,
    // files: 'dist/**',
    server: {
      baseDir: [config.build.temp, config.build.src, config.build.public],
      routes: {
        "/node_modules": "node_modules", // 先运行 routes 在运行 baseDir。
      },
    },
  });
};

const useRef = () => {
  return (
    src(config.build.paths.page, { base: config.build.temp, cwd: config.build.temp })
      .pipe(plugins.useref({ searchPath: [config.build.temp, "."] }))
      // 转化 html js css
      .pipe(plugins.if(/\.js$/, plugins.uglify()))
      .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
      .pipe(
        plugins.if(
          /\.html$/,
          plugins.htmlmin({
            collapseWhitespace: true,
            minifyCSS: true,
            minifyJS: true,
          })
        )
      )
      .pipe(dest(config.build.dist))
  );
};

const compile = parallel(style, script, page);

const build = series(
  clean,
  parallel(series(compile, useRef), image, font, extra)
);

const develop = series(compile, serve);

module.exports = {
  clean,
  build,
  develop,
};
