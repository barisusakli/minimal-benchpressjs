'use strict';

// Copied from NodeBB core

const { mkdirp } = require('mkdirp');
const path = require('path');
const fs = require('fs');

const _ = require('lodash');
const Benchpress = require('benchpressjs');

// output folder of built templates
const viewsPath = path.join(__dirname, './dist/templates');

// source of templates
const coreTemplatesPath = path.join(__dirname, './templates');

const Templates = module.exports;

// Adapted from http://stackoverflow.com/questions/5827612/node-js-fs-readdir-recursive-directory-search
async function walkDir(dir) {
	const subdirs = await fs.promises.readdir(dir);
	const files = await Promise.all(subdirs.map(async (subdir) => {
		const res = path.resolve(dir, subdir);
		return (await fs.promises.stat(res)).isDirectory() ? walkDir(res) : res;
	}));
	return files.reduce((a, f) => a.concat(f), []);
}

async function processImports(paths, templatePath, source) {
	const regex = /<!-- IMPORT (.+?) -->/;

	const matches = source.match(regex);

	if (!matches) {
		return source;
	}

	const partial = matches[1];
	if (paths[partial] && templatePath !== partial) {
		const partialSource = await fs.promises.readFile(paths[partial], 'utf8');
		source = source.replace(regex, partialSource);
		return await processImports(paths, templatePath, source);
	}

	console.warn(`[meta/templates] Partial not loaded: ${matches[1]}`);
	source = source.replace(regex, '');

	return await processImports(paths, templatePath, source);
}
Templates.processImports = processImports;

async function getTemplateFiles(dirs) {
	const buckets = await Promise.all(dirs.map(async (dir) => {
		let files = await walkDir(dir);
		files = files.filter(path => path.endsWith('.tpl')).map(file => ({
			name: path.relative(dir, file).replace(/\\/g, '/'),
			path: file,
		}));
		return files;
	}));

	const dict = {};
	buckets.forEach((files) => {
		files.forEach((file) => {
			dict[file.name] = file.path;
		});
	});

	return dict;
}

async function compileTemplate(filename, source) {
	let paths = await walkDir(viewsPath);
	paths = _.fromPairs(paths.map((p) => {
		const relative = path.relative(viewsPath, p).replace(/\\/g, '/');
		return [relative, p];
	}));

	source = await processImports(paths, filename, source);
	const compiled = await Benchpress.precompile(source, { filename });
	return await fs.promises.writeFile(path.join(viewsPath, filename.replace(/\.tpl$/, '.js')), compiled);
}
Templates.compileTemplate = compileTemplate;

async function compile() {
	await fs.promises.rm(viewsPath, { recursive: true, force: true });
	await mkdirp(viewsPath);


	const dirs = [coreTemplatesPath];
	const files = await getTemplateFiles(dirs);

	const minify = process.env.NODE_ENV !== 'development';

	await Promise.all(Object.keys(files).map(async (name) => {
		const filePath = files[name];
		let imported = await fs.promises.readFile(filePath, 'utf8');
		imported = await processImports(files, name, imported);

		await mkdirp(path.join(viewsPath, path.dirname(name)));

		// remove empty lines and whitespace
		if (minify) {
			imported = imported.split('\n').map(line => line.trim()).filter(Boolean).join('\n');
		}
		// await fs.promises.writeFile(path.join(viewsPath, name), imported);
		const compiled = await Benchpress.precompile(imported, { filename: name });
		await fs.promises.writeFile(path.join(viewsPath, name.replace(/\.tpl$/, '.jst')), compiled);
	}));

	console.info('[meta/templates] Successfully compiled templates.');
}
Templates.compile = compile;