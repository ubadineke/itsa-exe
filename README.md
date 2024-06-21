Generates an executable file that sends system information(cpu, mem, osInfo...) to a server when executed.

Designed for the ITSA Hackathon

# How to Use

-   [Build files from repo](#build-files-from-repo)
-   [Run already created executable file](#run-already-created-executable-file)

## Build files from repo

#### Clone the repo

```bash
$ git clone https://github.com/ubadineke/itsa-exe.git
```

#### Install the pkg package globally

Not using the official pkg package from vecel since it's been deprecated but there's an actively maintained fork [here](https://github.com/yao-pkg/pkg)

```bash
$ npm install -g @yao-pkg/pkg
```

#### Generate executable files

Automatically detects your node version and creates 3 executables for Linux, Windows and Mac OS

```bash
$ pkg dist/index.js
```

### <span style="color: red">If changes are made to the repository!, </span>

Changes like:

-   editing the api endpoint
-   adding extra information

#### First, rebuild the entire code and dependencies into one file

Install the ncc package

```bash
$ npm i -g @vercel/ncc
```

Then run:

```bash
$ ncc index.js
```

Then:

Ensure the pkg package is installed, if not, [hint](#install-the-pkg-package-globally)

Generate executable files, [hint](#generate-executable-files)

## Run already created executable file

The executable takes in two parameters, email and setupId generated from the website

```bash
collectinfo.exe <email> <setupId>
```

Eg:

```bash
collectinfo.exe abcd@gmail.com 8sfd982sd39
```

### Linux:

```bash
./collectinfo <email> <setupId>
```

### Windows:

```bash
collectinfo.exe <email> <setupId>
```
