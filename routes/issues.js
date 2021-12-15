import express from 'express';
import MarkdownIt from "markdown-it";
import markdownItCheckbox from 'markdown-it-checkbox'
import removeMarkdown from "markdown-to-text";

const router = express.Router();


const markdown = MarkdownIt({
  html: true,
}).use(
  markdownItCheckbox
);

export { markdown };

const fs = require('fs')

function getIssues(project, repository) {
  const path = __dirname + `/../issues/${project}/${repository}`;
  let issues = [];
  if (fs.existsSync(path)) {
    fs.readdirSync(path)
      .forEach(file => {
        issues.push({
          title: file.replace(".md", ""),
          iid: 1
        })
      });
  }
  return issues;
}

const readIssue = (path) => {
  const fullPath = __dirname + `/../issues/${path}`;
  return fs.readFileSync(fullPath).toString()
}

router.get('/:project/:repository/issues', function(req, res, next) {
  const project = req.params.project
  const repository = req.params.repository
  let issues = getIssues(project, repository);

  res.send(issues)
});

router.post('/:project/:repository/issues/update-issue', (req, res) => {
  const project = req.params.project
  const repository = req.params.repository
  let issues = getIssues(project, repository);
  if (issues.length) {
    let content = readIssue(`${project}/${repository}/${issues[0].title}.md`);
    let newContent = ''
    for (let line of content.split("\n")) {
      const nonFormattedText = removeMarkdown(line)
      if (nonFormattedText.indexOf(req.body.dep) > -1) {
        line = line.substr(6)
        if (req.body.selected) {
          line = " - [x]" + line
        } else {
          line = " - [ ]" + line
        }
      }
      newContent += line + '\n'
    }
    newContent = newContent.substr(0, newContent.length -1)
    writeIssueContent(project, repository, issues[0].title, newContent)
  }
  res.sendStatus(200)
})

router.get('/:project/:repository/issues/:id', function(req, res, next) {
  const project = req.params.project
  const repository = req.params.repository
  let issues = getIssues(project, repository);
  if (issues.length) {
    let content = readIssue(`${project}/${repository}/${issues[0].title}.md`);
    if (req.headers['accept'] === "application/json") {
      res.send({
        description: content
      })
    } else {
      const template = __dirname + '/../public/dependency-dashboard.html'
      let templateContent = fs.readFileSync(template).toString()
      let dependencyDashboardContent = markdown.render(content);
      templateContent = templateContent.replace('{ content }', dependencyDashboardContent)
      res.send(templateContent)
    }
  } else {
    res.sendStatus(404)
  }
});

const createFolderIfNecessary = (project, repository) => {
  const path = __dirname + `/../issues/${project}/${repository}`
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path, { recursive: true })
  }
}

function writeIssueContent(project, repository, title, content) {
  const path = __dirname + `/../issues/${project}/${repository}/${title}.md`;

  fs.writeFileSync(path, content);
}

function writeIssue(req) {
  const project = req.params.project;
  const repository = req.params.repository;

  createFolderIfNecessary(project, repository);

  writeIssueContent(project, repository, req.body.title,  req.body.description);
}

router.post('/:project/:repository/issues', function(req, res, next) {
  writeIssue(req);
  res.send({})
});
router.put('/:project/:repository/issues/:id', function(req, res, next) {
  writeIssue(req);
  res.send({})
});

module.exports = router;
