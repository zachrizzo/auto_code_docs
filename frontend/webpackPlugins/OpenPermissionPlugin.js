const fs = require('fs-extra');
const path = require('path');

class OpenPermissionsPlugin {
  constructor(options) {
    this.outputPath = options.outputPath;
    this.executableFiles = options.executableFiles || [];
  }

  apply(compiler) {
    compiler.hooks.afterEmit.tapAsync('OpenPermissionsPlugin', (compilation, callback) => {
      const outputPath = this.outputPath || compiler.options.output.path;

      const chmod = (dir) => {
        fs.readdirSync(dir).forEach((file) => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);

          if (stat.isDirectory()) {
            fs.chmodSync(filePath, '0777');
            chmod(filePath);
          } else {
            if (this.executableFiles.includes(file)) {
              fs.chmodSync(filePath, '0755');
            } else {
              fs.chmodSync(filePath, '0666');
            }
          }
        });
      };

      chmod(outputPath);

      // Ensure executable files have correct permissions
      this.executableFiles.forEach(file => {
        const filePath = path.join(outputPath, file);
        if (fs.existsSync(filePath)) {
          fs.chmodSync(filePath, '0755');
        }
      });

      callback();
    });
  }
}

module.exports = OpenPermissionsPlugin;
