Generates an.exe file that sends system information(cpu, mem, osInfo...) to a server when executed.


Designed for the ITSA Hackathon

## How to Use
- [Build files from repo](#build-files-from-repo)
- [Run already created exe file](#run-already-created-exe-file)

### Build files from repo 
Clone the repo 
```bash
$ git clone https://github.com/ubadineke/itsa-exe.git
```
install the pkg package globally 
Not using the official pkg package since it's been deprecated but there's an actively maintained fork [Here](https://github.com/yao-pkg/pkg)
```bash
$ npm install -g @yao-pkg/pkg
```
Generate the exe files 

If you make changes to the repo, probably changing the api endpoint 
You'll need to build the entire code and dependencies into one file 

Install the NCC package 

Run:

### Run already created exe file

