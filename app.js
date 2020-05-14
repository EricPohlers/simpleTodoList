require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const _ = require('lodash');

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

mongoose.connect(process.env.MONGO_URL, {
  useUnifiedTopology: true,
  useNewUrlParser: true,
  useFindAndModify: false,
});

const itemsSchema = new mongoose.Schema({
  name: String,
});

const Item = mongoose.model('Item', itemsSchema);

const item1 = new Item({
  name: 'Wake up',
});
const item2 = new Item({
  name: 'Grab a brush and put a little (makeup)',
});
const item3 = new Item({
  name: 'Hide the scars to fade away the (shakeup)',
});

const defaultItems = [item1, item2, item3];

const listSchema = new mongoose.Schema({
  name: String,
  items: [itemsSchema],
});

const List = mongoose.model('List', listSchema);

app.get('/', function (req, res) {
  Item.find({}, (err, items) => {
    if (err) {
      console.log(err);
    } else {
      if (items.length === 0) {
        Item.insertMany(defaultItems, (err) => {
          if (err) {
            console.log(err);
          }
        });
        res.redirect('/');
      } else {
        res.render('list', { listTitle: 'Today', newListItems: items });
      }
    }
  });
});

app.get('/:customListName', (req, res) => {
  const customListName = _.capitalize(req.params.customListName);
  List.findOne({ name: customListName }, (err, foundList) => {
    if (err) {
      console.log(err);
    } else {
      if (foundList) {
        // show existing list
        res.render('list', {
          listTitle: foundList.name,
          newListItems: foundList.items,
        });
      } else {
        //create a new list
        const list = new List({
          name: customListName,
          items: defaultItems,
        });
        list.save();
        res.redirect('/' + customListName);
      }
    }
  });
});

app.post('/', function (req, res) {
  const itemName = _.trim(req.body.newItem);
  const listName = _.trim(req.body.list);
  let redirectString = '/';
  if (!_.isEmpty(itemName)) {
    const newItem = new Item({
      name: itemName,
    });

    if (listName === 'Today') {
      newItem.save();
    } else {
      List.findOne({ name: listName }, (err, foundList) => {
        if (err) {
          console.log(err);
        } else {
          foundList.items.push(newItem);
          foundList.save();
          redirectString += listName;
        }
      });
    }
  }
  res.redirect(redirectString);
});

app.post('/delete', (req, res) => {
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;

  if (listName === 'Today') {
    Item.findByIdAndRemove(checkedItemId, (err) => {
      if (err) {
        console.log(err);
      } else {
        res.redirect('/');
      }
    });
  } else {
    List.findOneAndUpdate(
      { name: listName },
      { $pull: { items: { _id: checkedItemId } } },
      (err, result) => {
        if (err) {
          console.log(err);
        }
      }
    );
    res.redirect('/' + listName);
  }
});

let port = process.env.PORT;
if (port == null || port == '') {
  port = 3000;
}

app.listen(port, function () {
  console.log('Server has started successfully');
});
