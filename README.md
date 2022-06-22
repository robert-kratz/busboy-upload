# busboy-upload
This express middleware is handling fileuploads on top of connect-busboy. It provides an simple solution to deal with large files.

```
$ npm install busboy-upload
```

## Content

 - <a href="#usage">Usage</a>
 - <a href="#api-response">API Response</a>
 - <a href="#set-up-the-middleware">Set up the express middleware</a>
 - <a href="#file-object">Informations about the uploaded file</a>
 - <a href="#errors">Error Handling</a>
 - <a href="#test-your-code-with-axios">Test your code</a>

## Usage

First of all, we need to define the callbacks to get informations about the upload

```js
/**
 * Is fired when file has been successfully uploaded
 * @param {Object} fileInfo 
 */
const success = (file) => {

    console.log(file.stats); // { total: 20, error: 10, success: 10 }
    console.log(file.files); // Array of all files
    console.log(file.duration); //file upload duration in ms
    
}

const config = {
    uploadPath: __dirname + '/uploads/',
    uploadName: Date.now(),
    maxSize: 100000,
    mimeTypes: ['image/jpeg'], // Take a look into all aviable mime types here: https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
    maxsize: 100000, // In bytes
    filter: (file, deny) => {
        if(file.originalFile.filename == 'test.jpesg') return deny('INVALID_BIT_AMOUNT'); // Method needs to be returned!
    }
}
```

Note: If you do not want to apply a filter, just leave the config parameter blanc.

The parameter `file` in filter will have the format like <a href="#file-has-been-successfully-uploaded">this</a>.

## API Response

```js
{
  stats: { total: 20, error: 10, success: 10 },
  files: [],
  duration: 1041 //in ms
}
```

## Set up the middleware

The API needs to be included in one of the express Routers:

```js
const busboy = require('busboy');
const fileUpload = require('busboy-upload');

app.use(busboy({ immediate: true }));

app.use('/upload', (req, res) => {

  // Callbacks from above
  
  fileUpload(req, success, config);
});
```

## File Object

### File has been successfully uploaded:

```js
{
  errors: [],
  originalFile: {
    filename: 'test.jpeg',
    encoding: '7bit',
    mimeType: 'image/jpeg',
    uploadedPath: 'uploads/file9-test.jpeg-1655893178067.jpeg'
  },
  uploadedFile: {
    uploadedName: 'file9-test.jpeg-1655893178067',
    uploadedPath: 'uploads/file9-test.jpeg-1655893178067.jpeg',
    uploadDuration: 1,
    success: true,
    fileInfo: {
      _readableState: [Object],
      _events: {},
      _eventsCount: 0,
      truncated: false,
      _readcb: null
    },
    size: 89090
  }
}
```

### File has been not been successfully uploaded:

```js
{
  errors: [ 'FILE_TYPE_NOT_ALLOWED' ],
  originalFile: {
    filename: 'bomb.zip',
    encoding: '7bit',
    mimeType: 'application/zip'
  },
  uploadedFile: {
    uploadedName: 'bomb9-bomb.zip-1655893178067',
    uploadedPath: 'uploads/bomb9-bomb.zip-1655893178067.zip',
    uploadDuration: 0,
    success: false,
    fileInfo: {
      _readableState: [Object],
      _events: {},
      _eventsCount: 0,
      truncated: false,
      _readcb: null
    }
  }
}
```

Note: The file size is provided in Bytes


## Errors
The parameter `error` of a file returns one of these following errors. In the table below, you can learn how to deal with errors

Error | Meaning
--- | ---
FILE_TYPE_NOT_ALLOWED | The filetype does not match the provided query
UPLOADED_FILE_TO_BIG | The provided file exeedes the provided limit of bytes 
MAXMUM_FILE_AMOUNT_REACHED | The maximum file size has been reached, no files after the limit will be uploaded
FILE_TYPE_NOT_ALLOWED | The mime type is not allowed to be uploaded

Note: Other errors could occoure, in this case you probably did something wrong whith the config, open a <a href="https://github.com/robert-kratz/busboy-upload/issues">new issues</a>

## Test your code with axios

To test your code, you can start uploading file with <a href="https://github.com/axios/axios">axios</a>. For that, you need to have <a href="https://www.npmjs.com/package/form-data">form-data</a>, <a href="https://nodejs.org/api/fs.html">fs</a> and <a href="https://www.npmjs.com/package/axios">axios</a> installed, you can do that by running:

```
$ npm install fs form-data axios
```

### Sample code:

```js

const formData = require('form-data');
const fs = require('fs');

const axios = require('axios').default;

const init = async () => {
    const fd = new formData();

    fd.append('cat', fs.createReadStream('./miau.jpeg'));
    fd.append('dog', fs.createReadStream('./dog.jpeg'));

    const res = await axios.post('http://127.0.0.1:443/upload', fd, {
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
            headers: {
                ...fd.getHeaders()
            }
    }).then(res => {
        console.log(res.data);
    }).catch(err => console.log(err));
}

init();
```

 Made by <a href="https://github.com/robert-kratz">Robert J. Kratz</a>
 
 ## License
 
 MIT