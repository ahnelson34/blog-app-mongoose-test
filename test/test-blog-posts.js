'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const should = chai.should();

const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

function tearDownDb() {
    return new Promise((resolve, reject) => {
      console.warn('Deleting database');
      mongoose.connection.dropDatabase()
        .then(result => resolve(result))
        .catch(err => reject(err));
    });
}

function seedBlogPostData() {
    console.info('seeding blog post data');
    const seedData = [];
    for (let i=1; i<=10; i++) {
        seedData.push({
            author: {
                firstName: faker.name.firstName(),
                lastName: faker.name.lastName()
            },
        title: faker.lorem.sentence(),
        content: faker.lorem.paragraph()
        });
    }
    return BlogPost.insertMany(seedData);
}

describe('Blog posts API resource', function() {
    before(function() {
        return runServer(TEST_DATABASE_URL);
    });
  
    beforeEach(function() {
        return seedBlogPostData();
    });
  
    afterEach(function() {
        return tearDownDb();
    });
  
    after(function() {
        return closeServer();
    });
    
    describe('GET endpoint', function() {
        it('should return all exisiting blog posts', function() {
            let res;
            return chai.request(app)
            .get('/posts')
            .then(function(_res) {
                res = _res;
                res.should.have.status(200);
                res.body.should.have.lengthOf.at.least(1);
                return BlogPost.count();
            })
            .then(function(count) {
                res.body.should.have.lengthOf(count);
            });
        });
    
        it('should return posts with correct fields', function() {
            let resPosts;
            return chai.request(app)
            .get('/posts')
            .then(function(res) {
                res.should.have.status(200);
                res.should.be.json;
                res.body.should.be.a('array');
                res.body.should.have.lengthOf.at.least(1);

                res.body.forEach(function(post) {
                    post.should.be.a('object');
                    post.should.include.keys(
                        'id', 'title', 'content', 'author', 'created'
                    );
                });
                resPost = res.body[0];
                return BlogPost.findById(resPost.id);
            })
            .then(function(post) {
                resPost.id.should.equal(post.id);
                resPost.title.should.equal(post.title);
                resPost.content.should.equal(post.content);
                resPost.author.should.equal(post.authorName);
            });
        });        
    });

    describe('Post endpoint', function() {
        it('should add a new blog post', function() {
            const newBlogPost = {
                title: faker.lorem.sentence(),
                author: {
                    firstName: faker.name.firstName(),
                    lastName: faker.name.lastName(),
                },
                content: faker.lorem.paragraph()
            };
            return chai.request(app)
            .post('/posts')
            .send(newBlogPost)
            .then(function(res) {
                res.should.have.status(201);
                res.should.be.json;
                res.body.should.be.a('object');
                res.body.should.include.keys(
                    'id', 'title', 'content', 'author', 'created'
                );
                res.body.title.should.equal(newBlogPost.title);
                res.body.id.should.not.be.null;
                res.body.content.should.equal(newBlogPost.content);
                res.body.author.should.equal(
                    `${newBlogPost.firstName} ${newBlogPost.lastName}`
                );
            })
            .then(function(post) {
                post.title.should.equal(newBlogPost.title);
                post.content.should.equal(newBlogPost.content);
                post.author.firstName.should.equal(newBlogPost.author.firstName);
                post.author.lastName.should.equal(newBlogPost.author.lastName);
            });
        });
    });
    describe('PUT endpoint', function() {
        it('should update fields you send over', function() {
            const updateData = {
                title: 'this is the updated title', 
                content: 'this is the updated content', 
                author: {
                    firstName: 'this is the updated firstName',
                    lastName: 'this is the updated lastName'
                }
            };

            return BlogPost
            .findOne()
            .then(post => {
                updateData.id = post.id;
                return chai.request(app)
                    .put(`/posts/${post.id}`)
                    .send(updateData);
            })
            .then(res => {
                res.should.have.status(204);
                
                return BlogPost.findById(updateData.id);
            })
            .then(post => {
                post.title.should.equal(updateData.title);
                post.content.should.equal(updateData.content);
                post.author.firstName.should.equal(updateData.author.firstName);
                post.author.lastName.should.equal(updateData.author.lastName);
            });
            
        });
    });
    describe('DELETE endpoint', function(){ 
        it('should delete a blog post by id', function() {
            let post;

            return BlogPost
            .findOne()
            .then(_post => {
                post = _post;
                return chai.request(app).delete(`/posts/${post.id}`);
            })
            .then(res => {
                res.should.have.status(204);
                return BlogPost.findById(post.id);
            })
            .then(_post => {
                _post.should.be.null
            });
        });
    });
});    